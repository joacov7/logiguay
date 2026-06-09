import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AlertsService } from '../alerts/alerts.service';
import { TripEventType, TripStatus } from '@prisma/client';

export interface PositionPayload {
  vehicleId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
}

export interface StoredPosition {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  connectionStatus: string;
}

const STATUS_TO_EVENT: Partial<Record<TripStatus, TripEventType>> = {
  EN_CARGA: TripEventType.LLEGADA_ORIGEN,
  EN_TRANSITO: TripEventType.SALIDA_ORIGEN,
  EN_DESCARGA: TripEventType.LLEGADA_DESTINO,
  FINALIZADO: TripEventType.SALIDA_DESTINO,
};

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly alerts: AlertsService,
  ) {}

  async processPosition(payload: PositionPayload): Promise<StoredPosition> {
    const { vehicleId, lat, lng, speed, heading } = payload;

    const now = new Date();
    const position: StoredPosition = {
      lat,
      lng,
      speed,
      heading,
      timestamp: now.toISOString(),
      connectionStatus: 'CONNECTED',
    };

    await this.prisma.vehiclePosition.create({
      data: { vehicleId, lat, lng, speed, heading, connectionStatus: 'CONNECTED' },
    });

    await this.redis.setJson(`vehicle:${vehicleId}:position`, position, 300);

    await this.detectLostSignal(vehicleId);
    await this.redis.set(`vehicle:${vehicleId}:last_seen`, now.toISOString(), 360);

    const activeTrip = await this.getActiveTrip(vehicleId);
    if (activeTrip) {
      await this.checkGeofences(activeTrip, lat, lng);
      await this.updateEta(activeTrip, lat, lng, speed);
    }

    return position;
  }

  private async getActiveTrip(vehicleId: string) {
    return this.prisma.trip.findFirst({
      where: {
        vehicleId,
        status: {
          in: [
            TripStatus.ASIGNADO,
            TripStatus.EN_CAMINO_ORIGEN,
            TripStatus.EN_CARGA,
            TripStatus.EN_TRANSITO,
            TripStatus.EN_DESCARGA,
          ],
        },
      },
      include: {
        cargo: {
          select: {
            originLat: true,
            originLng: true,
            destinationLat: true,
            destinationLng: true,
          },
        },
        transportCompany: { select: { id: true } },
      },
    });
  }

  private async checkGeofences(trip: any, lat: number, lng: number) {
    const companyId = trip.transportCompanyId;
    if (!companyId) return;

    const fences = await this.prisma.geoFence.findMany({ where: { companyId } });

    for (const fence of fences) {
      const inFenceNow = this.haversineDistance(lat, lng, fence.lat, fence.lng) <= fence.radiusMeters;
      const redisKey = `vehicle:${trip.vehicleId}:fence:${fence.id}`;
      const wasInFence = await this.redis.exists(redisKey);

      if (inFenceNow && !wasInFence) {
        await this.redis.set(redisKey, '1', 600);
        await this.onFenceEnter(trip, fence, lat, lng);
      } else if (!inFenceNow && wasInFence) {
        await this.redis.del(redisKey);
        await this.onFenceExit(trip, fence, lat, lng);
      }
    }
  }

  private async onFenceEnter(trip: any, fence: any, lat: number, lng: number) {
    let eventType: TripEventType | null = null;
    let newStatus: TripStatus | null = null;

    if (fence.type === 'ORIGEN' && trip.status === TripStatus.EN_CAMINO_ORIGEN) {
      eventType = TripEventType.LLEGADA_ORIGEN;
      newStatus = TripStatus.EN_CARGA;
    } else if (fence.type === 'DESTINO' && trip.status === TripStatus.EN_TRANSITO) {
      eventType = TripEventType.LLEGADA_DESTINO;
      newStatus = TripStatus.EN_DESCARGA;
    }

    if (eventType) {
      await this.prisma.tripEvent.create({
        data: { tripId: trip.id, type: eventType, lat, lng },
      });
    }

    if (newStatus) {
      await this.prisma.trip.update({ where: { id: trip.id }, data: { status: newStatus } });
      this.logger.log(`Trip ${trip.id}: ${trip.status} → ${newStatus} (geofence enter: ${fence.name})`);
    }
  }

  private async onFenceExit(trip: any, fence: any, lat: number, lng: number) {
    let eventType: TripEventType | null = null;
    let newStatus: TripStatus | null = null;

    if (fence.type === 'ORIGEN' && trip.status === TripStatus.EN_CARGA) {
      eventType = TripEventType.SALIDA_ORIGEN;
      newStatus = TripStatus.EN_TRANSITO;
    } else if (fence.type === 'DESTINO' && trip.status === TripStatus.EN_DESCARGA) {
      eventType = TripEventType.SALIDA_DESTINO;
      newStatus = TripStatus.FINALIZADO;
    }

    if (eventType) {
      await this.prisma.tripEvent.create({
        data: { tripId: trip.id, type: eventType, lat, lng },
      });
    }

    if (newStatus) {
      const updateData: any = { status: newStatus };
      if (newStatus === TripStatus.FINALIZADO) updateData.finishedAt = new Date();

      await this.prisma.trip.update({ where: { id: trip.id }, data: updateData });
      this.logger.log(`Trip ${trip.id}: ${trip.status} → ${newStatus} (geofence exit: ${fence.name})`);
    }
  }

  private async detectLostSignal(vehicleId: string) {
    const lastSeenStr = await this.redis.get(`vehicle:${vehicleId}:last_seen`);
    if (!lastSeenStr) return;

    const lastSeen = new Date(lastSeenStr);
    const gapMs = Date.now() - lastSeen.getTime();
    const gapMinutes = gapMs / 60000;

    if (gapMinutes >= 5) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: { companyId: true },
      });

      if (!vehicle) return;

      const activeTrip = await this.getActiveTrip(vehicleId);
      if (activeTrip) {
        await this.prisma.tripEvent.create({
          data: { tripId: activeTrip.id, type: TripEventType.PERDIDA_SENAL },
        });
      }

      await this.alerts.create({
        companyId: vehicle.companyId,
        tripId: activeTrip?.id,
        type: 'PERDIDA_SENAL',
        message: `Vehículo ${vehicleId} sin señal por más de ${Math.round(gapMinutes)} minutos`,
      });
    }
  }

  async updateEta(trip: any, currentLat: number, currentLng: number, speed?: number) {
    if (!trip.cargo) return;

    let destLat: number | null = null;
    let destLng: number | null = null;

    if (
      [TripStatus.EN_CAMINO_ORIGEN, TripStatus.ASIGNADO].includes(trip.status) &&
      trip.cargo.originLat &&
      trip.cargo.originLng
    ) {
      destLat = trip.cargo.originLat;
      destLng = trip.cargo.originLng;
    } else if (trip.cargo.destinationLat && trip.cargo.destinationLng) {
      destLat = trip.cargo.destinationLat;
      destLng = trip.cargo.destinationLng;
    }

    if (destLat === null || destLng === null) return;

    const distanceKm = this.haversineDistance(currentLat, currentLng, destLat, destLng) / 1000;
    const avgSpeedKmh = (speed && speed > 5) ? speed * 3.6 : 60;
    const etaHours = distanceKm / avgSpeedKmh;
    const eta = new Date(Date.now() + etaHours * 3600 * 1000);

    await this.prisma.trip.update({
      where: { id: trip.id },
      data: { estimatedArrival: eta },
    });

    await this.redis.setJson(`trip:${trip.id}:eta`, { eta: eta.toISOString(), distanceKm }, 120);
  }

  async getVehiclePosition(vehicleId: string) {
    const cached = await this.redis.getJson<StoredPosition>(`vehicle:${vehicleId}:position`);
    if (cached) return cached;

    return this.prisma.vehiclePosition.findFirst({
      where: { vehicleId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getFleetPositions(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId, status: 'ACTIVO' },
      select: { id: true, plate: true, type: true, brand: true, model: true },
    });

    return Promise.all(
      vehicles.map(async (v) => {
        const position = await this.getVehiclePosition(v.id);
        const activeTrip = await this.getActiveTrip(v.id);
        return { ...v, position, activeTrip: activeTrip ? { id: activeTrip.id, status: activeTrip.status } : null };
      }),
    );
  }

  async getVehicleHistory(vehicleId: string, from?: Date, to?: Date) {
    return this.prisma.vehiclePosition.findMany({
      where: {
        vehicleId,
        ...(from || to ? { timestamp: { gte: from, lte: to } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });
  }

  haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  getStatusEventMap(): Partial<Record<TripStatus, TripEventType>> {
    return STATUS_TO_EVENT;
  }
}
