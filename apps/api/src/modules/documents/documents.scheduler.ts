import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DocumentsScheduler {
  private readonly logger = new Logger(DocumentsScheduler.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkAllCompanyDocuments() {
    this.logger.log('Running daily document expiry check...');
    const companies = await this.prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    let totalAlerts = 0;
    for (const company of companies) {
      await this.documentsService.checkExpiries(company.id);
      const alerts = await this.documentsService.generateExpiryAlerts(company.id);
      totalAlerts += alerts;
    }

    this.logger.log(`Daily check complete. Generated ${totalAlerts} alerts.`);
  }
}
