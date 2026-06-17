import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BillingModule } from '../billing/billing.module';
import { CargoController } from './cargo.controller';
import { CargoService } from './cargo.service';

@Module({
  imports: [SubscriptionsModule, BillingModule],
  controllers: [CargoController],
  providers: [CargoService],
  exports: [CargoService],
})
export class CargoModule {}
