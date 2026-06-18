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
import { EmailService } from '../../common/email/email.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
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

    // Siempre creamos empresa para DADOR y TRANSPORTISTA (los roles que operan cargas).
    // Si no se provee nombre, usamos el del usuario. Esto evita usuarios sin empresa
    // que después no pueden publicar ni ver sus cargas.
    let companyId: string | null = null;
    const role = (dto.role ?? 'DADOR');
    const needsCompany = role === 'DADOR' || role === 'TRANSPORTISTA' || !!dto.companyName;
    if (needsCompany) {
      const cuit = dto.cuit ?? (await this.generateUniqueCuit());
      const company = await this.prisma.company.create({
        data: {
          name: dto.companyName || `${dto.firstName} ${dto.lastName}`,
          cuit,
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

  /** Genera un CUIT placeholder único (el usuario lo edita luego con el real). */
  private async generateUniqueCuit(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const rand = Math.floor(10000000 + Math.random() * 90000000);
      const cuit = `00-${rand}-0`;
      const existing = await this.prisma.company.findUnique({ where: { cuit } });
      if (!existing) return cuit;
    }
    return `00-${Date.now().toString().slice(-8)}-0`;
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
    // Siempre devuelve ok para evitar enumeración de emails
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true },
    });
    if (!user) return { ok: true };

    const token = randomBytes(32).toString('hex');
    await this.redis.set(`pwd_reset:${token}`, user.id, 60 * 60); // 1 hora TTL

    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'https://logiguay.com.ar';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Log sin el token — el token es un secreto, no debe aparecer en logs
    this.logger.log(`Password reset solicitado para ${email}`);

    try {
      await this.email.sendPasswordReset({
        to: email,
        name: user.firstName ?? 'Usuario',
        resetUrl,
      });
    } catch (e) {
      this.logger.error(`No se pudo enviar email de reset a ${email}: ${(e as Error).message}`);
    }

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
