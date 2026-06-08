import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCargoDto, UpdateCargoDto } from './dto/cargo.dto';

@Injectable()
export class CargoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCargoDto) {
    return this.prisma.cargo.create({
      data: {
        ...dto,
        requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : null,
        status: 'PENDIENTE',
      },
    });
  }

  async findAll(filters: {
    companyId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { companyId, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.cargo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true } },
          _count: { select: { quotes: true } },
        },
      }),
      this.prisma.cargo.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id },
      include: {
        company: true,
        trips: { include: { driver: true, vehicle: true } },
        quotes: { include: { transportCompany: { select: { id: true, name: true } } } },
      },
    });
    if (!cargo) throw new NotFoundException('Carga no encontrada');
    return cargo;
  }

  async update(id: string, dto: UpdateCargoDto) {
    const cargo = await this.findOne(id);

    if (cargo.status === 'CANCELADO') {
      throw new BadRequestException('No se puede modificar una carga cancelada');
    }

    return this.prisma.cargo.update({ where: { id }, data: dto });
  }

  async publish(id: string) {
    const cargo = await this.findOne(id);
    if (cargo.status !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden publicar cargas en estado PENDIENTE');
    }
    return this.prisma.cargo.update({ where: { id }, data: { status: 'PUBLICADO' } });
  }

  async cancel(id: string) {
    await this.findOne(id);
    return this.prisma.cargo.update({ where: { id }, data: { status: 'CANCELADO' } });
  }

  async getMarketplace(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.cargo.findMany({
        where: { status: 'PUBLICADO' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true, country: true } },
          _count: { select: { quotes: true } },
        },
      }),
      this.prisma.cargo.count({ where: { status: 'PUBLICADO' } }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
