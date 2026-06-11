import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TrackingGateway } from './tracking.gateway';
import { TrackingController } from './tracking.controller';
import { TraccarWebhookController } from './traccar-webhook.controller';
import { TrackingService } from './tracking.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    AlertsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({ secret: cfg.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TrackingController, TraccarWebhookController],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingGateway, TrackingService],
})
export class TrackingModule {}
