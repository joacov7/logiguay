import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

interface FindAllFilters {
  companyId: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateDriverDto) {
    const { firstName, lastName, email, phone, licenseNumber, licenseExpiry, password } = dto;

    const plainPassword = password || randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    let user = await this.prisma.user.findUnique({ where: { email } });
    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'CHOFER' as any,
        },
      });
    } else {
      // Update password if explicitly provided
      if (password) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword, role: 'CHOFER' as any },
        });
      }
    }

    const expiry = new Date(licenseExpiry);
    const now = new Date();
    const status = expiry < now ? 'VENCIDO' : 'ACTIVO';

    const driver = await this.prisma.driver.create({
      data: {
        userId: user.id,
        companyId,
        licenseNumber,
        licenseExpiry: expiry,
        status,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Return plain password only on creation so the transportista can share it with the chofer
    return { ...driver, tempPassword: isNewUser || password ? plainPassword : undefined };
  }

  async findAll(filters: FindAllFilters) {
    const { companyId, status, search, page = 1, limit = 20 } = filters;
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const skip = (p - 1) * l;

    const where: any = { companyId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        skip,
        take: l,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          _count: { select: { trips: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driver.count({ where }),
    ]);

    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) };
  }

  async findOne(id: string, companyId?: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: true,
        company: true,
        documents: true,
        trips: {
          where: {
            status: {
              notIn: ['FINALIZADO', 'CANCELADO'],
            },
          },
        },
      },
    });
    if (!driver) throw new NotFoundException('Chofer no encontrado');
    if (companyId && driver.companyId !== companyId) {
      throw new NotFoundException('Chofer no encontrado');
    }
    return driver;
  }

  async update(id: string, dto: UpdateDriverDto, companyId: string) {
    const driver = await this.findOne(id, companyId);

    const driverData: any = {};
    if (dto.licenseNumber !== undefined) driverData.licenseNumber = dto.licenseNumber;
    if (dto.licenseExpiry !== undefined) {
      driverData.licenseExpiry = new Date(dto.licenseExpiry);
      const now = new Date();
      driverData.status = driverData.licenseExpiry < now ? 'VENCIDO' : 'ACTIVO';
    }

    const userUpdate: any = {};
    if (dto.firstName !== undefined) userUpdate.firstName = dto.firstName;
    if (dto.lastName !== undefined) userUpdate.lastName = dto.lastName;
    if (dto.email !== undefined) userUpdate.email = dto.email;
    if (dto.phone !== undefined) userUpdate.phone = dto.phone;

    if (Object.keys(userUpdate).length > 0) {
      await this.prisma.user.update({
        where: { id: driver.userId },
        data: userUpdate,
      });
    }

    if (Object.keys(driverData).length === 0) {
      return this.findOne(id);
    }

    return this.prisma.driver.update({
      where: { id },
      data: driverData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
  }

  async delete(id: string, companyId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        trips: {
          where: {
            status: {
              notIn: ['FINALIZADO', 'CANCELADO'],
            },
          },
        },
      },
    });
    if (!driver) throw new NotFoundException('Chofer no encontrado');
    if (driver.companyId !== companyId) throw new NotFoundException('Chofer no encontrado');
    if (driver.trips.length > 0) {
      throw new BadRequestException('No se puede eliminar un chofer con viajes activos');
    }
    return this.prisma.driver.delete({ where: { id } });
  }

  async getStats(companyId: string) {
    const now = new Date();

    const [all, onTrip, withExpiredLicense] = await Promise.all([
      this.prisma.driver.findMany({
        where: { companyId },
        select: { status: true },
      }),
      this.prisma.driver.count({
        where: {
          companyId,
          trips: {
            some: {
              status: {
                notIn: ['FINALIZADO', 'CANCELADO'],
              },
            },
          },
        },
      }),
      this.prisma.driver.count({
        where: {
          companyId,
          licenseExpiry: { lt: now },
        },
      }),
    ]);

    const active = all.filter((d) => d.status === 'ACTIVO').length;

    return {
      total: all.length,
      active,
      withExpiredLicense,
      onTrip,
    };
  }
}
