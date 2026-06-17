import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TrackingService, PositionPayload } from './tracking.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.API_CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean) || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  private clientMeta = new Map<string, { userId: string; role: string; companyId: string }>();

  constructor(
    private readonly trackingService: TrackingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.headers.authorization as string)?.replace('Bearer ', '');

    if (!token) {
      client.emit('error', { message: 'Token requerido' });
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      this.clientMeta.set(client.id, { userId: payload.sub, role: payload.role, companyId: payload.companyId ?? '' });
      this.logger.log(`WS connected: ${client.id} (user=${payload.sub}, role=${payload.role})`);
    } catch {
      client.emit('error', { message: 'Token inválido' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS disconnected: ${client.id}`);
    this.clientMeta.delete(client.id);
  }

  @SubscribeMessage('subscribe-vehicle')
  async handleSubscribeVehicle(@MessageBody() vehicleId: string, @ConnectedSocket() client: Socket) {
    const meta = this.clientMeta.get(client.id);
    if (!meta) { client.disconnect(true); return; }
    // Verify the vehicle belongs to the authenticated user's company
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { companyId: true } });
    if (!vehicle || (meta.role !== 'ADMIN' && vehicle.companyId !== meta.companyId)) {
      return { event: 'error', data: 'Acceso denegado' };
    }
    client.join(`vehicle:${vehicleId}`);
    return { event: 'subscribed', data: vehicleId };
  }

  @SubscribeMessage('unsubscribe-vehicle')
  handleUnsubscribeVehicle(@MessageBody() vehicleId: string, @ConnectedSocket() client: Socket) {
    client.leave(`vehicle:${vehicleId}`);
    return { event: 'unsubscribed', data: vehicleId };
  }

  @SubscribeMessage('subscribe-company')
  handleSubscribeCompany(@MessageBody() companyId: string, @ConnectedSocket() client: Socket) {
    const meta = this.clientMeta.get(client.id);
    if (!meta) { client.disconnect(true); return; }
    // Only allow subscribing to own company room (ADMIN can subscribe to any)
    if (meta.role !== 'ADMIN' && companyId !== meta.companyId) {
      return { event: 'error', data: 'Acceso denegado' };
    }
    client.join(`company:${companyId}`);
    return { event: 'subscribed-company', data: companyId };
  }

  @SubscribeMessage('subscribe-trip')
  async handleSubscribeTrip(@MessageBody() tripId: string, @ConnectedSocket() client: Socket) {
    const meta = this.clientMeta.get(client.id);
    if (!meta) { client.disconnect(true); return; }
    // Verify the trip involves the authenticated user's company (as carrier or shipper/dador)
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { transportCompanyId: true, cargo: { select: { companyId: true } } },
    });
    if (!trip) return { event: 'error', data: 'Viaje no encontrado' };
    const involved = meta.role === 'ADMIN' ||
      trip.transportCompanyId === meta.companyId ||
      trip.cargo?.companyId === meta.companyId;
    if (!involved) return { event: 'error', data: 'Acceso denegado' };
    client.join(`trip:${tripId}`);
    return { event: 'subscribed-trip', data: tripId };
  }

  @SubscribeMessage('position-update')
  async handlePositionUpdate(
    @MessageBody() data: PositionPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.clientMeta.get(client.id);
    if (!meta) throw new UnauthorizedException();

    this.logger.log(
      `position-update de user=${meta.userId} vehicle=${data?.vehicleId} lat=${data?.lat} lng=${data?.lng}`,
    );

    if (!data?.vehicleId || data.lat == null || data.lng == null) {
      this.logger.warn(`position-update inválido (falta vehicleId/lat/lng): ${JSON.stringify(data)}`);
      return { received: false, error: 'vehicleId, lat y lng son requeridos' };
    }

    const position = await this.trackingService.processPosition(data);

    const payload = { vehicleId: data.vehicleId, ...position };

    // Emitir al room del vehículo (suscripción individual)
    this.server.to(`vehicle:${data.vehicleId}`).emit('position', payload);

    // Emitir también al room de la empresa dueña del vehículo, así el mapa
    // de la web (suscrito por empresa) recibe la posición en tiempo real.
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
      select: { companyId: true },
    });
    if (vehicle?.companyId) {
      this.server.to(`company:${vehicle.companyId}`).emit('position', payload);
    }

    return { received: true, timestamp: position.timestamp };
  }

  broadcastAlert(companyId: string, alert: any) {
    this.server.to(`company:${companyId}`).emit('alert', alert);
  }

  broadcastPosition(vehicleId: string, position: any) {
    this.server.to(`vehicle:${vehicleId}`).emit('position', { vehicleId, ...position });
  }

  broadcastTripStatusChange(tripId: string, companyId: string, status: string) {
    this.server.to(`trip:${tripId}`).emit('trip-status', { tripId, status });
    this.server.to(`company:${companyId}`).emit('trip-status', { tripId, status });
  }
}
