import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { TrackingController } from './tracking.controller';

@Module({
  controllers: [TrackingController],
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class TrackingModule {}
