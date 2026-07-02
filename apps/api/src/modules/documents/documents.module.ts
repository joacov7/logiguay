import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsScheduler } from './documents.scheduler';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [ScheduleModule.forRoot(), AlertsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsScheduler],
  exports: [DocumentsService],
})
export class DocumentsModule {}
