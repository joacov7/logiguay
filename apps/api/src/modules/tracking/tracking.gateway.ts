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
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

interface PositionUpdate {
  vehicleId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  private connectedClients = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client.id);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe-vehicle')
  handleSubscribeVehicle(
    @MessageBody() vehicleId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`vehicle:${vehicleId}`);
    this.logger.log(`Client ${client.id} subscribed to vehicle ${vehicleId}`);
    return { event: 'subscribed', data: vehicleId };
  }

  @SubscribeMessage('unsubscribe-vehicle')
  handleUnsubscribeVehicle(
    @MessageBody() vehicleId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`vehicle:${vehicleId}`);
    return { event: 'unsubscribed', data: vehicleId };
  }

  @SubscribeMessage('subscribe-company')
  handleSubscribeCompany(
    @MessageBody() companyId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`company:${companyId}`);
    return { event: 'subscribed-company', data: companyId };
  }

  @SubscribeMessage('position-update')
  async handlePositionUpdate(
    @MessageBody() data: PositionUpdate,
    @ConnectedSocket() client: Socket,
  ) {
    const position = await this.prisma.vehiclePosition.create({
      data: {
        vehicleId: data.vehicleId,
        lat: data.lat,
        lng: data.lng,
        speed: data.speed,
        heading: data.heading,
        connectionStatus: 'CONNECTED',
      },
    });

    await this.redis.setJson(`vehicle:${data.vehicleId}:position`, position, 300);

    this.server.to(`vehicle:${data.vehicleId}`).emit('position', position);

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
      select: { companyId: true },
    });

    if (vehicle) {
      this.server.to(`company:${vehicle.companyId}`).emit('vehicle-position', {
        vehicleId: data.vehicleId,
        ...position,
      });
    }

    return position;
  }

  async broadcastAlert(companyId: string, alert: any) {
    this.server.to(`company:${companyId}`).emit('alert', alert);
  }
}
