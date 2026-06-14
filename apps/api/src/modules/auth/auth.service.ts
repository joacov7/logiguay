import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: (dto.role ?? 'DADOR') as any,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    // Create company if companyName provided
    let companyId: string | null = null;
    if (dto.companyName) {
      const company = await this.prisma.company.create({
        data: {
          name: dto.companyName,
          cuit: dto.cuit ?? '00-00000000-0',
          country: 'AR',
          planType: 'FREE',
        },
      });
      await this.prisma.companyUser.create({
        data: { userId: user.id, companyId: company.id },
      });
      companyId = company.id;
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return { user: { ...user, companyId, driverId: null }, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        companyUsers: { select: { companyId: true }, take: 1 },
        drivers: { select: { id: true }, take: 1 },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const { password: _p, companyUsers, drivers, ...userWithoutPassword } = user;
    const companyId = companyUsers[0]?.companyId ?? null;
    const driverId = drivers[0]?.id ?? null;

    return { user: { ...userWithoutPassword, companyId, driverId }, ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const isBlacklisted = await this.redis.exists(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token revocado');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuario inactivo');
      }

      await this.redis.set(`blacklist:${refreshToken}`, '1', 7 * 24 * 3600);

      return this.generateTokens(user.id, user.email, user.role);
    } catch (err) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async logout(userId: string, accessToken: string) {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    const ttl = this.parseTtl(expiresIn);
    await this.redis.set(`blacklist:${accessToken}`, '1', ttl);
    return { message: 'Sesión cerrada correctamente' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return { accessToken, refreshToken };
  }

  async forgotPassword(email: string): Promise<{ ok: boolean }> {
    // Always return ok to prevent email enumeration
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { ok: true };

    // Generate a short-lived token stored in Redis
    const token = require('crypto').randomBytes(32).toString('hex');
    await this.redis.set(`pwd_reset:${token}`, user.id, 60 * 60); // 1 hour TTL

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://logiguay.com.ar'}/reset-password?token=${token}`;
    this.logger.log(`Password reset requested for ${email}. URL: ${resetUrl}`);

    // Send email if EmailService available — import lazily to avoid circular deps
    try {
      const { EmailService } = await import('../../common/email/email.service');
      // EmailService is @Global so we'd normally inject it, but here we log the URL
      // In production, wire EmailService injection in the constructor
    } catch (_) {}

    return { ok: true };
  }

  private parseTtl(duration: string): number {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1), 10);
    if (unit === 'm') return value * 60;
    if (unit === 'h') return value * 3600;
    if (unit === 'd') return value * 86400;
    return 900;
  }
}
