import { Module, forwardRef } from '@nestjs/common';
import { TurnosController } from './turnos.controller';
import { TurnosService } from './turnos.service';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [forwardRef(() => TrackingModule)],
  controllers: [TurnosController],
  providers: [TurnosService],
  exports: [TurnosService],
})
export class TurnosModule {}
