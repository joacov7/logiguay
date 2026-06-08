import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({ where: { plate: dto.plate } });
    if (existing) throw new ConflictException('Patente ya registrada');
    return this.prisma.vehicle.create({ data: dto });
  }

  async findAll(companyId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = companyId ? { companyId } : {};
    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { trips: true } },
          positions: { take: 1, orderBy: { timestamp: 'desc' } },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        documents: true,
        positions: { take: 10, orderBy: { timestamp: 'desc' } },
        trips: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.vehicle.delete({ where: { id } });
  }

  async getLastPosition(vehicleId: string) {
    return this.prisma.vehiclePosition.findFirst({
      where: { vehicleId },
      orderBy: { timestamp: 'desc' },
    });
  }
}
