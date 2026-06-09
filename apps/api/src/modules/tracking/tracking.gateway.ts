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

@WebSocketGateway({
  cors: { origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', credentials: true },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  private clientMeta = new Map<string, { userId: string; role: string }>();

  constructor(
    private readonly trackingService: TrackingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
      this.clientMeta.set(client.id, { userId: payload.sub, role: payload.role });
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
  handleSubscribeVehicle(@MessageBody() vehicleId: string, @ConnectedSocket() client: Socket) {
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
    client.join(`company:${companyId}`);
    return { event: 'subscribed-company', data: companyId };
  }

  @SubscribeMessage('subscribe-trip')
  handleSubscribeTrip(@MessageBody() tripId: string, @ConnectedSocket() client: Socket) {
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

    const position = await this.trackingService.processPosition(data);

    this.server.to(`vehicle:${data.vehicleId}`).emit('position', {
      vehicleId: data.vehicleId,
      ...position,
    });

    return { received: true, timestamp: position.timestamp };
  }

  broadcastAlert(companyId: string, alert: any) {
    this.server.to(`company:${companyId}`).emit('alert', alert);
  }

  broadcastTripStatusChange(tripId: string, companyId: string, status: string) {
    this.server.to(`trip:${tripId}`).emit('trip-status', { tripId, status });
    this.server.to(`company:${companyId}`).emit('trip-status', { tripId, status });
  }
}
