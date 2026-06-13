import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TripStatus, TripEventType, CommissionType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateTripDto, UpdateTripStatusDto, AddTripEventDto, AssignTripDto } from './dto/trip.dto';

const STATUS_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  PENDIENTE: [TripStatus.PUBLICADO, TripStatus.CANCELADO],
  PUBLICADO: [TripStatus.COTIZANDO, TripStatus.CANCELADO],
  COTIZANDO: [TripStatus.ASIGNADO, TripStatus.CANCELADO],
  ASIGNADO: [TripStatus.EN_CAMINO_ORIGEN, TripStatus.CANCELADO],
  EN_CAMINO_ORIGEN: [TripStatus.EN_CARGA, TripStatus.CANCELADO],
  EN_CARGA: [TripStatus.EN_TRANSITO],
  EN_TRANSITO: [TripStatus.EN_DESCARGA],
  EN_DESCARGA: [TripStatus.FINALIZADO],
  FINALIZADO: [],
  CANCELADO: [],
};

const STATUS_TO_EVENT: Partial<Record<TripStatus, TripEventType>> = {
  EN_CARGA: TripEventType.LLEGADA_ORIGEN,
  EN_TRANSITO: TripEventType.SALIDA_ORIGEN,
  EN_DESCARGA: TripEventType.LLEGADA_DESTINO,
  FINALIZADO: TripEventType.SALIDA_DESTINO,
};

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async create(dto: CreateTripDto) {
    const cargo = await this.prisma.cargo.findUnique({ where: { id: dto.cargoId } });
    if (!cargo) throw new NotFoundException('Carga no encontrada');

    const trip = await this.prisma.trip.create({
      data: {
        cargoId: dto.cargoId,
        transportCompanyId: dto.transportCompanyId,
        estimatedArrival: dto.estimatedArrival ? new Date(dto.estimatedArrival) : null,
        status: TripStatus.PENDIENTE,
      },
      include: { cargo: true },
    });

    await this.syncCargoStatus(dto.cargoId, TripStatus.PENDIENTE);
    return trip;
  }

  async assign(id: string, dto: AssignTripDto, requester?: { role: string; companyId?: string }) {
    const trip = await this.findOne(id, requester);

    if (trip.status !== TripStatus.ASIGNADO && trip.status !== TripStatus.COTIZANDO) {
      throw new BadRequestException('Solo se puede asignar un viaje en estado COTIZANDO o ASIGNADO');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');

    const driver = await this.prisma.driver.findUnique({ where: { id: dto.driverId } });
    if (!driver) throw new NotFoundException('Chofer no encontrado');

    return this.prisma.trip.update({
      where: { id },
      data: {
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        agreedRate: dto.agreedRate,
        commission: dto.commission,
        commissionType: dto.commissionType,
        status: TripStatus.ASIGNADO,
      },
      include: { cargo: true, vehicle: true, driver: { include: { user: true } } },
    });
  }

  async findAll(filters: {
    companyId?: string;
    cargoCompanyId?: string;
    status?: string;
    driverId?: string;
    vehicleId?: string;
    page?: number;
    limit?: number;
  }) {
    const { companyId, cargoCompanyId, status, driverId, vehicleId } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (companyId) where.transportCompanyId = companyId;
    if (cargoCompanyId) where.cargo = { companyId: cargoCompanyId };
    if (status) where.status = status;
    if (driverId) where.driverId = driverId;
    if (vehicleId) where.vehicleId = vehicleId;

    const [data, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cargo: {
            select: {
              id: true,
              type: true,
              originAddress: true,
              destinationAddress: true,
              weightTons: true,
            },
          },
          vehicle: { select: { id: true, plate: true, type: true } },
          driver: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
          transportCompany: { select: { id: true, name: true } },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, requester?: { role: string; companyId?: string; driverId?: string }) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        cargo: true,
        vehicle: true,
        driver: { include: { user: true } },
        transportCompany: true,
        events: { orderBy: { timestamp: 'asc' } },
        alerts: { orderBy: { createdAt: 'desc' }, take: 10 },
        invoices: true,
      },
    });
    if (!trip) throw new NotFoundException('Viaje no encontrado');

    if (requester && requester.role !== 'ADMIN') {
      const role = requester.role;
      const allowed =
        (role === 'TRANSPORTISTA' && trip.transportCompanyId === requester.companyId) ||
        (role === 'DADOR' && (trip.cargo as any)?.companyId === requester.companyId) ||
        (role === 'CHOFER' && trip.driverId === requester.driverId);
      if (!allowed) throw new NotFoundException('Viaje no encontrado');
    }

    return trip;
  }

  async updateStatus(id: string, dto: UpdateTripStatusDto, requester?: { role: string; companyId?: string; driverId?: string }) {
    const trip = await this.findOne(id, requester);
    const allowed = STATUS_TRANSITIONS[trip.status as TripStatus] ?? [];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transición inválida: ${trip.status} → ${dto.status}. Permitidas: ${allowed.join(', ') || 'ninguna'}`,
      );
    }

    const updateData: any = { status: dto.status };

    switch (dto.status) {
      case TripStatus.EN_CAMINO_ORIGEN:
        updateData.startedAt = new Date();
        break;
      case TripStatus.FINALIZADO:
        updateData.finishedAt = new Date();
        updateData.actualArrival = new Date();
        break;
      case TripStatus.CANCELADO:
        updateData.canceledAt = new Date();
        updateData.cancelReason = dto.cancelReason;
        break;
    }

    const updated = await this.prisma.trip.update({ where: { id }, data: updateData });

    const eventType = STATUS_TO_EVENT[dto.status as TripStatus];
    if (eventType) {
      await this.prisma.tripEvent.create({
        data: { tripId: id, type: eventType, notes: dto.notes },
      });
    }

    await this.syncCargoStatus(trip.cargoId, dto.status);

    if (dto.status === TripStatus.FINALIZADO) {
      await this.handleTripFinalized(updated);
    }

    if (dto.status === TripStatus.CANCELADO && trip.transportCompanyId) {
      await this.alerts.create({
        companyId: trip.transportCompanyId,
        tripId: id,
        type: 'CANCELACION',
        message: `Viaje cancelado. Motivo: ${dto.cancelReason || 'Sin especificar'}`,
      });
    }

    this.logger.log(`Trip ${id}: ${trip.status} → ${dto.status}`);
    return updated;
  }

  private async handleTripFinalized(trip: any) {
    if (!trip.agreedRate || !trip.transportCompanyId) return;

    // Commission agreed between dador and transportista
    const commissionAmount = this.calculateCommission(
      trip.agreedRate,
      trip.commission,
      trip.commissionType,
    );

    if (commissionAmount > 0) {
      await this.prisma.invoice.create({
        data: {
          companyId: trip.transportCompanyId,
          tripId: trip.id,
          type: 'COMISION',
          amount: commissionAmount,
          status: 'PENDIENTE',
        },
      });
      this.logger.log(`Invoice created for trip ${trip.id}: commission $${commissionAmount}`);
    }

    // Platform fee based on subscription plan of the transport company
    try {
      const limits = await this.subscriptions.getPlanLimits(trip.transportCompanyId);
      const platformFee = Math.round(trip.agreedRate * (limits.commissionRate / 100));
      if (platformFee > 0) {
        await this.prisma.invoice.create({
          data: {
            companyId: trip.transportCompanyId,
            tripId: trip.id,
            type: 'COMISION',
            amount: platformFee,
            status: 'PENDIENTE',
          },
        });
        this.logger.log(`Platform fee for trip ${trip.id}: $${platformFee} (${limits.commissionRate}%)`);
      }
    } catch (e) {
      this.logger.warn(`Could not calculate platform fee for trip ${trip.id}: ${(e as Error).message}`);
    }

    await this.prisma.invoice.create({
      data: {
        companyId: trip.transportCompanyId,
        tripId: trip.id,
        type: 'VIAJE',
        amount: trip.agreedRate,
        status: 'PENDIENTE',
      },
    });
  }

  private calculateCommission(
    rate: number,
    commission?: number | null,
    type?: CommissionType | null,
  ): number {
    if (!commission || !type) return 0;

    switch (type) {
      case CommissionType.PORCENTAJE:
        return rate * (commission / 100);
      case CommissionType.FIJO:
        return commission;
      case CommissionType.HIBRIDO:
        return rate * (commission / 100) + commission;
      default:
        return 0;
    }
  }

  private async syncCargoStatus(cargoId: string, tripStatus: TripStatus) {
    const cargoStatusMap: Partial<Record<TripStatus, string>> = {
      PENDIENTE: 'PENDIENTE',
      PUBLICADO: 'PUBLICADO',
      COTIZANDO: 'COTIZANDO',
      ASIGNADO: 'ASIGNADO',
      CANCELADO: 'CANCELADO',
    };

    const cargoStatus = cargoStatusMap[tripStatus];
    if (cargoStatus) {
      await this.prisma.cargo.update({
        where: { id: cargoId },
        data: { status: cargoStatus as any },
      });
    }
  }

  async addEvent(tripId: string, dto: AddTripEventDto) {
    await this.findOne(tripId);
    return this.prisma.tripEvent.create({
      data: {
        tripId,
        type: dto.type as TripEventType,
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

  async getEta(tripId: string) {
    const trip = await this.findOne(tripId);
    return {
      tripId,
      status: trip.status,
      estimatedArrival: trip.estimatedArrival,
      startedAt: trip.startedAt,
    };
  }

  async cancel(id: string, reason: string, _requesterId?: string, requester?: { role: string; companyId?: string; driverId?: string }) {
    const trip = await this.findOne(id, requester);

    if (trip.status === TripStatus.FINALIZADO || trip.status === TripStatus.CANCELADO) {
      throw new BadRequestException('Este viaje no puede ser cancelado');
    }

    return this.updateStatus(id, {
      status: TripStatus.CANCELADO,
      cancelReason: reason,
    });
  }
}
