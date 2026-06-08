import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDriverDto) {
    return this.prisma.driver.create({
      data: {
        ...dto,
        licenseExpiry: new Date(dto.licenseExpiry),
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async findAll(companyId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = companyId ? { companyId } : {};
    const [data, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          _count: { select: { trips: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driver.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: true,
        documents: true,
        trips: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!driver) throw new NotFoundException('Chofer no encontrado');
    return driver;
  }

  async update(id: string, dto: UpdateDriverDto) {
    await this.findOne(id);
    return this.prisma.driver.update({
      where: { id },
      data: {
        ...dto,
        licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined,
      },
    });
  }

  async checkExpiringLicenses(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.driver.findMany({
      where: {
        licenseExpiry: { lte: futureDate },
        status: 'ACTIVO',
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }
}
