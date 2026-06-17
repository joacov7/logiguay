import {
  Controller,
  Post,
  Body,
  Query,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';

/**
 * Webhook que recibe posiciones reenviadas por Traccar (forward.url).
 * No usa JWT: Traccar es un servicio interno. Se protege con un token
 * compartido en la query string (TRACCAR_WEBHOOK_TOKEN).
 *
 * Formato del body (Traccar position forwarding, JSON):
 * { "position": { "latitude", "longitude", "speed", "course", ... },
 *   "device": { "uniqueId", ... } }
 */
@ApiTags('Tracking')
@Controller('tracking/traccar')
export class TraccarWebhookController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly gateway: TrackingGateway,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook de posiciones desde Traccar (token interno)' })
  async receive(@Query('token') token: string, @Body() body: any) {
    const expected = this.config.get<string>('TRACCAR_WEBHOOK_TOKEN');
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Token inválido');
    }

    const uniqueId: string | undefined = body?.device?.uniqueId;
    const lat: number | undefined = body?.position?.latitude;
    const lng: number | undefined = body?.position?.longitude;

    if (!uniqueId || typeof lat !== 'number' || typeof lng !== 'number') {
      throw new BadRequestException('Payload de Traccar incompleto');
    }

    const result = await this.trackingService.processTraccarPosition({
      uniqueId,
      lat,
      lng,
      speedKnots: typeof body.position.speed === 'number' ? body.position.speed : undefined,
      course: typeof body.position.course === 'number' ? body.position.course : undefined,
    });

    if (result) {
      this.gateway.broadcastPosition(result.vehicleId, result.position);
      this.gateway.broadcastPositionToCompany(result.companyId, result.vehicleId, result.position);
    }

    // 200 siempre que el payload sea válido: si el dispositivo no está
    // vinculado todavía, no queremos que Traccar reintente en loop.
    return { ok: true, linked: !!result };
  }
}
