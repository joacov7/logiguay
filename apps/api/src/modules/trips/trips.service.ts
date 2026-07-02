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
import { EmailService } from '../../common/email/email.service';
import { CreateTripDto, UpdateTripStatusDto, AddTripEventDto, AssignTripDto } from './dto/trip.dto';

const STATUS_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  PENDIENTE: [TripStatus.PUBLICADO, TripStatus.CANCELADO],
  PUBLICADO: [TripStatus.COTIZANDO, TripStatus.CANCELADO],
  COTIZANDO: [TripStatus.ASIGNADO, TripStatus.CANCELADO],
  ASIGNADO: [TripStatus.EN_CAMINO_ORIGEN, TripStatus.CANCELADO],
  EN_CAMINO_ORIGEN: [TripStatus.EN_CARGA, TripStatus.CANCELADO],
  EN_CARGA: [TripStatus.EN_TRANSITO, TripStatus.CANCELADO],
  EN_TRANSITO: [TripStatus.EN_DESCARGA, TripStatus.CANCELADO],
  EN_DESCARGA: [TripStatus.FINALIZADO, TripStatus.CANCELADO],
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
    private readonly email: EmailService,
  ) {}

  async create(dto: CreateTripDto, requester?: { id: string; role: string }) {
    const cargo = await this.prisma.cargo.findUnique({ where: { id: dto.cargoId } });
    if (!cargo) throw new NotFoundException('Carga no encontrada');

    // Un DADOR solo puede crear viajes sobre cargas de sus propias empresas
    if (requester && requester.role !== 'ADMIN') {
      const memberships = await this.prisma.companyUser.findMany({
        where: { userId: requester.id },
        select: { companyId: true },
      });
      if (!memberships.some((m) => m.companyId === cargo.companyId)) {
        throw new ForbiddenException('La carga no pertenece a tu empresa');
      }
    }

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

  async assign(id: string, dto: AssignTripDto, requester?: { id?: string; role: string; companyId?: string }) {
    const trip = await this.findOne(id, requester);

    if (trip.status !== TripStatus.ASIGNADO && trip.status !== TripStatus.COTIZANDO) {
      throw new BadRequestException('Solo se puede asignar un viaje en estado COTIZANDO o ASIGNADO');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');

    const driver = await this.prisma.driver.findUnique({ where: { id: dto.driverId } });
    if (!driver) throw new NotFoundException('Chofer no encontrado');

    // Vehículo y chofer deben pertenecer a una empresa del transportista
    if (requester && requester.role !== 'ADMIN' && requester.id) {
      const memberships = await this.prisma.companyUser.findMany({
        where: { userId: requester.id },
        select: { companyId: true },
      });
      const companyIds = memberships.map((m) => m.companyId);
      if (!companyIds.includes(vehicle.companyId)) {
        throw new ForbiddenException('El vehículo no pertenece a tu empresa');
      }
      if (!companyIds.includes(driver.companyId)) {
        throw new ForbiddenException('El chofer no pertenece a tu empresa');
      }
    }

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
    userId?: string;
    scope?: 'transport' | 'cargo';
    status?: string;
    driverId?: string;
    vehicleId?: string;
    page?: number;
    limit?: number;
  }) {
    const { companyId, cargoCompanyId, userId, scope, status, driverId, vehicleId } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;
    const where: any = {};

    // Cuando llega userId+scope, filtramos por TODAS las empresas del usuario
    // (un usuario puede pertenecer a varias). Consistente con el listado de cargas.
    if (userId && scope) {
      const memberships = await this.prisma.companyUser.findMany({
        where: { userId },
        select: { companyId: true },
      });
      const companyIds = memberships.map((m) => m.companyId);
      if (companyIds.length === 0) {
        return { data: [], total: 0, page, limit, pages: 0 };
      }
      if (scope === 'transport') {
        where.transportCompanyId = companyIds.length === 1 ? companyIds[0] : { in: companyIds };
      } else {
        where.cargo = { companyId: companyIds.length === 1 ? companyIds[0] : { in: companyIds } };
      }
    }
    if (companyId) where.transportCompanyId = companyId;
    if (cargoCompanyId) where.cargo = { companyId: cargoCompanyId };
    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
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

  async findOne(id: string, requester?: { role: string; companyId?: string; driverId?: string; id?: string }) {
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

    if (requester && requester.role !== 'ADMIN') {
      const role = requester.role;
      // El usuario puede pertenecer a varias empresas: validamos contra todas.
      let companyIds: string[] = requester.companyId ? [requester.companyId] : [];
      if (requester.id && (role === 'TRANSPORTISTA' || role === 'DADOR')) {
        const memberships = await this.prisma.companyUser.findMany({
          where: { userId: requester.id },
          select: { companyId: true },
        });
        companyIds = memberships.map((m) => m.companyId);
      }
      const allowed =
        (role === 'TRANSPORTISTA' && companyIds.includes(trip.transportCompanyId ?? '')) ||
        (role === 'DADOR' && companyIds.includes((trip.cargo as any)?.companyId ?? '')) ||
        (role === 'CHOFER' && requester.driverId != null && trip.driverId === requester.driverId);
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

    // Update condicionado al estado leído: si otro request ya lo transicionó,
    // count === 0 y evitamos efectos duplicados (comisiones, eventos, emails).
    const result = await this.prisma.trip.updateMany({
      where: { id, status: trip.status },
      data: updateData,
    });
    if (result.count === 0) {
      throw new BadRequestException('El viaje cambió de estado. Actualizá e intentá de nuevo.');
    }
    // El estado final es conocido localmente: evita un SELECT extra que además
    // podría observar una escritura concurrente posterior (o null si borran el viaje).
    const updated = { ...trip, ...updateData };

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

    // Email notifications for status changes
    this.sendTripStatusEmails(trip, dto.status).catch(() => {});

    this.logger.log(`Trip ${id}: ${trip.status} → ${dto.status}`);
    return updated;
  }

  private async handleTripFinalized(trip: any) {
    if (!trip.agreedRate || !trip.transportCompanyId) return;

    const rate = trip.agreedRate;

    // Empresa dadora (dueña de la carga) para cobrarle su comisión.
    const cargo = await this.prisma.cargo.findUnique({
      where: { id: trip.cargoId },
      select: { companyId: true },
    });
    const shipperCompanyId = cargo?.companyId ?? null;

    // ── Comisión de plataforma al TRANSPORTISTA (según su plan) ──
    try {
      const { carrierRate } = await this.subscriptions.getCommissionRatesForCompany(
        trip.transportCompanyId,
      );
      const carrierFee = Math.round(rate * (carrierRate / 100));
      if (carrierFee > 0) {
        await this.prisma.invoice.create({
          data: {
            companyId: trip.transportCompanyId,
            tripId: trip.id,
            type: 'COMISION',
            payerRole: 'TRANSPORTISTA',
            concept: `Comisión Logiguay — transportista (${carrierRate}%)`,
            amount: carrierFee,
            status: 'PENDIENTE',
          },
        });
        this.logger.log(`Comisión transportista viaje ${trip.id}: $${carrierFee} (${carrierRate}%)`);
      }
    } catch (e) {
      this.logger.warn(`No se pudo calcular comisión del transportista (viaje ${trip.id}): ${(e as Error).message}`);
    }

    // ── Comisión de plataforma al DADOR (según su plan) ──
    if (shipperCompanyId) {
      try {
        const { shipperRate } = await this.subscriptions.getCommissionRatesForCompany(
          shipperCompanyId,
        );
        const shipperFee = Math.round(rate * (shipperRate / 100));
        if (shipperFee > 0) {
          await this.prisma.invoice.create({
            data: {
              companyId: shipperCompanyId,
              tripId: trip.id,
              type: 'COMISION',
              payerRole: 'DADOR',
              concept: `Comisión Logiguay — dador (${shipperRate}%)`,
              amount: shipperFee,
              status: 'PENDIENTE',
            },
          });
          this.logger.log(`Comisión dador viaje ${trip.id}: $${shipperFee} (${shipperRate}%)`);
        }
      } catch (e) {
        this.logger.warn(`No se pudo calcular comisión del dador (viaje ${trip.id}): ${(e as Error).message}`);
      }
    }

    // ── Factura del flete (ingreso del transportista) ──
    await this.prisma.invoice.create({
      data: {
        companyId: trip.transportCompanyId,
        tripId: trip.id,
        type: 'VIAJE',
        payerRole: 'DADOR',
        concept: 'Flete acordado',
        amount: rate,
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

  private async sendTripStatusEmails(trip: any, newStatus: TripStatus) {
    const NOTIFY_STATUSES = [
      TripStatus.EN_CAMINO_ORIGEN, TripStatus.EN_TRANSITO,
      TripStatus.FINALIZADO, TripStatus.CANCELADO,
    ];
    if (!NOTIFY_STATUSES.includes(newStatus as any)) return;

    try {
      const full = await this.prisma.trip.findUnique({
        where: { id: trip.id },
        include: {
          cargo: {
            include: {
              company: {
                include: { companyUsers: { include: { user: { select: { email: true, firstName: true } } } } },
              },
            },
          },
          transportCompany: {
            include: { companyUsers: { include: { user: { select: { email: true, firstName: true } } } } },
          },
        },
      });
      if (!full) return;

      const cargoType = full.cargo?.type ?? 'Carga';
      const origin = full.cargo?.originAddress ?? '';
      const destination = full.cargo?.destinationAddress ?? '';

      const dadoEmail = (full.cargo as any)?.company?.companyUsers?.[0]?.user?.email;
      const dadoName = (full.cargo as any)?.company?.companyUsers?.[0]?.user?.firstName ?? 'Usuario';
      const transportEmail = (full.transportCompany as any)?.companyUsers?.[0]?.user?.email;
      const transportName = (full.transportCompany as any)?.companyUsers?.[0]?.user?.firstName ?? 'Usuario';

      const params = { cargoType, origin, destination, tripId: trip.id, newStatus };

      if (newStatus === TripStatus.FINALIZADO) {
        if (dadoEmail) await this.email.sendTripFinalized({ to: dadoEmail, recipientName: dadoName, cargoType, origin, destination, amount: full.agreedRate ?? 0, tripId: trip.id });
        if (transportEmail) await this.email.sendTripFinalized({ to: transportEmail, recipientName: transportName, cargoType, origin, destination, amount: full.agreedRate ?? 0, tripId: trip.id });
      } else {
        if (dadoEmail) await this.email.sendTripStatusUpdate({ to: dadoEmail, recipientName: dadoName, ...params });
        if (transportEmail) await this.email.sendTripStatusUpdate({ to: transportEmail, recipientName: transportName, ...params });
      }
    } catch (e) {
      this.logger.warn(`Email de estado no enviado: ${(e as Error).message}`);
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

  async addEvent(tripId: string, dto: AddTripEventDto, requester?: { id?: string; role: string; companyId?: string; driverId?: string }) {
    await this.findOne(tripId, requester);
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

  async getEvents(tripId: string, requester?: { id?: string; role: string; companyId?: string; driverId?: string }) {
    await this.findOne(tripId, requester);
    return this.prisma.tripEvent.findMany({
      where: { tripId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getEta(tripId: string, requester?: { id?: string; role: string; companyId?: string; driverId?: string }) {
    const trip = await this.findOne(tripId, requester);
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
