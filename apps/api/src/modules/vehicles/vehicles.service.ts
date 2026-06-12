import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto, UpdateVehicleStatusDto } from './dto/vehicle.dto';
import { VehicleType, VehicleStatus } from '@prisma/client';

interface FindAllFilters {
  companyId: string;
  type?: VehicleType;
  status?: VehicleStatus;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({ where: { plate: dto.plate.toUpperCase() } });
    if (existing) throw new ConflictException('Patente ya registrada');
    return this.prisma.vehicle.create({
      data: {
        ...dto,
        companyId,
        plate: dto.plate.toUpperCase(),
      },
    });
  }

  async findAll(filters: FindAllFilters) {
    const { companyId, type, status, search, page = 1, limit = 20 } = filters;
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const skip = (p - 1) * l;

    const where: any = { companyId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { plate: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { trips: true } },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) };
  }

  async findOne(id: string, companyId?: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        company: true,
        documents: { orderBy: { expiresAt: 'asc' } },
        trips: {
          where: {
            status: {
              notIn: ['FINALIZADO', 'CANCELADO'],
            },
          },
        },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    if (companyId && vehicle.companyId !== companyId) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto, companyId: string) {
    await this.findOne(id, companyId);
    const data: any = { ...dto };
    if (data.companyId) delete data.companyId;
    if (data.plate) data.plate = data.plate.toUpperCase();
    return this.prisma.vehicle.update({ where: { id }, data });
  }

  async updateStatus(id: string, dto: UpdateVehicleStatusDto, companyId: string) {
    const vehicle = await this.findOne(id, companyId);
    if (dto.status === VehicleStatus.ACTIVO) {
      const expiredDocs = (vehicle as any).documents?.filter(
        (d: any) => d.status === 'VENCIDO',
      );
      if (expiredDocs && expiredDocs.length > 0) {
        throw new BadRequestException(
          'No se puede activar un vehículo con documentos vencidos',
        );
      }
    }
    return this.prisma.vehicle.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async delete(id: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
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
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    if (vehicle.companyId !== companyId) throw new NotFoundException('Vehículo no encontrado');
    if (vehicle.trips.length > 0) {
      throw new BadRequestException('No se puede eliminar un vehículo con viajes activos');
    }
    return this.prisma.vehicle.delete({ where: { id } });
  }

  async getStats(companyId: string) {
    const [all, onTrip] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: { companyId },
        select: { status: true, type: true },
      }),
      this.prisma.vehicle.count({
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
    ]);

    const byStatus = {} as Record<VehicleStatus, number>;
    const byType = {} as Record<VehicleType, number>;

    for (const v of all) {
      byStatus[v.status] = (byStatus[v.status] || 0) + 1;
      byType[v.type] = (byType[v.type] || 0) + 1;
    }

    return {
      total: all.length,
      byStatus,
      byType,
      onTrip,
    };
  }
}
