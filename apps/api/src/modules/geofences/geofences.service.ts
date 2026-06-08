import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGeoFenceDto } from './dto/geofence.dto';

@Injectable()
export class GeofencesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGeoFenceDto) {
    return this.prisma.geoFence.create({ data: dto });
  }

  async findAll(companyId?: string) {
    return this.prisma.geoFence.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const fence = await this.prisma.geoFence.findUnique({ where: { id } });
    if (!fence) throw new NotFoundException('Geocerca no encontrada');
    return fence;
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.geoFence.delete({ where: { id } });
  }

  checkPointInFence(
    lat: number,
    lng: number,
    fenceLat: number,
    fenceLng: number,
    radiusMeters: number,
  ): boolean {
    const R = 6371000;
    const dLat = ((fenceLat - lat) * Math.PI) / 180;
    const dLng = ((fenceLng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((fenceLat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distance <= radiusMeters;
  }

  async checkVehicleInFences(vehicleId: string, lat: number, lng: number, companyId: string) {
    const fences = await this.findAll(companyId);
    return fences.filter((f) =>
      this.checkPointInFence(lat, lng, f.lat, f.lng, f.radiusMeters),
    );
  }
}
