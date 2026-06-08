import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTripDto, UpdateTripStatusDto, AddTripEventDto } from './dto/trip.dto';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDIENTE: ['PUBLICADO', 'CANCELADO'],
  PUBLICADO: ['COTIZANDO', 'CANCELADO'],
  COTIZANDO: ['ASIGNADO', 'CANCELADO'],
  ASIGNADO: ['EN_CAMINO_ORIGEN', 'CANCELADO'],
  EN_CAMINO_ORIGEN: ['EN_CARGA'],
  EN_CARGA: ['EN_TRANSITO'],
  EN_TRANSITO: ['EN_DESCARGA'],
  EN_DESCARGA: ['FINALIZADO'],
  FINALIZADO: [],
  CANCELADO: [],
};

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTripDto) {
    return this.prisma.trip.create({
      data: {
        ...dto,
        estimatedArrival: dto.estimatedArrival ? new Date(dto.estimatedArrival) : null,
        status: 'PENDIENTE',
      },
      include: { cargo: true, vehicle: true, driver: { include: { user: true } } },
    });
  }

  async findAll(filters: { companyId?: string; status?: string; page?: number; limit?: number }) {
    const { companyId, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (companyId) where.transportCompanyId = companyId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cargo: { select: { id: true, type: true, originAddress: true, destinationAddress: true } },
          vehicle: { select: { id: true, plate: true, type: true } },
          driver: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        cargo: true,
        vehicle: true,
        driver: { include: { user: true } },
        transportCompany: true,
        events: { orderBy: { timestamp: 'asc' } },
        alerts: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!trip) throw new NotFoundException('Viaje no encontrado');
    return trip;
  }

  async updateStatus(id: string, dto: UpdateTripStatusDto) {
    const trip = await this.findOne(id);
    const allowedTransitions = STATUS_TRANSITIONS[trip.status] || [];

    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar de ${trip.status} a ${dto.status}`,
      );
    }

    const updateData: any = { status: dto.status };

    if (dto.status === 'EN_CAMINO_ORIGEN') updateData.startedAt = new Date();
    if (dto.status === 'FINALIZADO') updateData.finishedAt = new Date();
    if (dto.status === 'CANCELADO') {
      updateData.canceledAt = new Date();
      updateData.cancelReason = dto.cancelReason;
    }

    const updated = await this.prisma.trip.update({
      where: { id },
      data: updateData,
    });

    await this.addEvent(id, {
      type: dto.status,
      notes: dto.notes || dto.cancelReason,
    });

    return updated;
  }

  async addEvent(tripId: string, dto: AddTripEventDto) {
    return this.prisma.tripEvent.create({
      data: {
        tripId,
        type: dto.type as any,
        lat: dto.lat,
        lng: dto.lng,
        notes: dto.notes,
      },
    });
  }

  async getEvents(tripId: string) {
    await this.findOne(tripId);
    return this.prisma.tripEvent.findMany({
      where: { tripId },
      orderBy: { timestamp: 'asc' },
    });
  }
}
