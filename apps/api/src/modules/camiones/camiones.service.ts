import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CamionesService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(companyId: string, dto: {
    vehicleId?: string;
    vehicleType: string;
    capacityTons?: number;
    capacityM3?: number;
    originAddress: string;
    originLat?: number;
    originLng?: number;
    availableFrom: string;
    availableTo: string;
    notes?: string;
  }) {
    return this.prisma.truckAvailability.create({
      data: {
        companyId,
        vehicleId: dto.vehicleId,
        vehicleType: dto.vehicleType,
        capacityTons: dto.capacityTons,
        capacityM3: dto.capacityM3,
        originAddress: dto.originAddress,
        originLat: dto.originLat,
        originLng: dto.originLng,
        availableFrom: new Date(dto.availableFrom),
        availableTo: new Date(dto.availableTo),
        notes: dto.notes,
        isActive: true,
      },
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async search(lat?: number, lng?: number, radiusKm = 200, vehicleType?: string) {
    const where: any = {
      isActive: true,
      availableTo: { gte: new Date() },
    };
    if (vehicleType) where.vehicleType = vehicleType;

    const trucks = await this.prisma.truckAvailability.findMany({
      where,
      include: { company: { select: { id: true, name: true } } },
      orderBy: { availableFrom: 'asc' },
    });

    if (lat != null && lng != null) {
      const R = 6371;
      return trucks
        .map((t) => {
          if (t.originLat == null || t.originLng == null) return { ...t, distKm: null };
          const dLat = ((t.originLat - lat) * Math.PI) / 180;
          const dLng = ((t.originLng - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((t.originLat * Math.PI) / 180) *
              Math.sin(dLng / 2) ** 2;
          return { ...t, distKm: R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) };
        })
        .filter((t) => t.distKm == null || t.distKm <= radiusKm)
        .sort((a, b) => (a.distKm ?? 999) - (b.distKm ?? 999));
    }

    return trucks;
  }

  async getMyListings(companyId: string) {
    return this.prisma.truckAvailability.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deactivate(id: string, companyId: string) {
    const t = await this.prisma.truckAvailability.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Disponibilidad no encontrada');
    if (t.companyId !== companyId) throw new BadRequestException('Sin acceso');
    return this.prisma.truckAvailability.update({ where: { id }, data: { isActive: false } });
  }
}
