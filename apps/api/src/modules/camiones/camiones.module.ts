import { Module } from '@nestjs/common';
import { CamionesController } from './camiones.controller';
import { CamionesService } from './camiones.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  controllers: [CamionesController],
  providers: [CamionesService],
})
export class CamionesModule {}
