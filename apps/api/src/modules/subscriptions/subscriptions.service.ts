import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PlanType } from '@prisma/client';

const PLAN_PRICES: Record<PlanType, number> = {
  FREE: 0,
  PRO: 4999,
  EMPRESA: 14999,
  FLOTA: 29999,
};

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActivePlan(companyId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        companyId,
        status: { in: ['ACTIVA', 'TRIAL'] },
        endDate: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscription;
  }

  async subscribe(companyId: string, plan: PlanType) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    await this.prisma.subscription.updateMany({
      where: { companyId, status: 'ACTIVA' },
      data: { status: 'CANCELADA' },
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = await this.prisma.subscription.create({
      data: {
        companyId,
        plan,
        status: 'ACTIVA',
        startDate,
        endDate,
        amount: PLAN_PRICES[plan],
      },
    });

    await this.prisma.company.update({ where: { id: companyId }, data: { planType: plan } });

    return subscription;
  }

  async cancel(companyId: string) {
    const active = await this.getActivePlan(companyId);
    if (!active) throw new NotFoundException('No hay suscripción activa');

    await this.prisma.subscription.update({
      where: { id: active.id },
      data: { status: 'CANCELADA' },
    });

    await this.prisma.company.update({ where: { id: companyId }, data: { planType: 'FREE' } });

    return { message: 'Suscripción cancelada' };
  }

  async getHistory(companyId: string) {
    return this.prisma.subscription.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  getPlanPrices() {
    return Object.entries(PLAN_PRICES).map(([plan, price]) => ({ plan, price }));
  }
}
