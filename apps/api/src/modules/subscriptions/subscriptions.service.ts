import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PlanType } from '@prisma/client';
import { PLAN_LIMITS, PlanLimits } from '../../common/config/plan-limits.config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const PLAN_PRICES: Record<PlanType, number> = {
  FREE: 0,
  PRO: 29900,
  EMPRESA: 89900,
  FLOTA: 199900,
};

const PLAN_LABELS: Record<PlanType, string> = {
  FREE: 'Plan Free', PRO: 'Plan Pro', EMPRESA: 'Plan Empresa', FLOTA: 'Plan Flota',
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly mp = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN ?? '',
  });

  constructor(private readonly prisma: PrismaService) {}

  async getCompanyPlan(companyId: string): Promise<PlanType> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { planType: true },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return company.planType;
  }

  async getPlanLimits(companyId: string): Promise<PlanLimits> {
    const plan = await this.getCompanyPlan(companyId);
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS['FREE'];
  }

  async checkLimit(
    companyId: string,
    limitKey: keyof PlanLimits,
    currentCount: number,
  ): Promise<void> {
    const limits = await this.getPlanLimits(companyId);
    const limit = limits[limitKey];
    if (typeof limit === 'number' && currentCount >= limit) {
      throw new ForbiddenException(
        `Has alcanzado el límite de tu plan (${limit}). Actualizá tu plan para continuar.`,
      );
    }
    if (typeof limit === 'boolean' && !limit) {
      throw new ForbiddenException(`Tu plan no permite esta funcionalidad. Actualizá tu plan.`);
    }
  }

  async activate(companyId: string, plan: PlanType, months: number) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    await this.prisma.subscription.updateMany({
      where: { companyId, status: 'ACTIVA' },
      data: { status: 'CANCELADA' },
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    const amount = PLAN_PRICES[plan] * months;

    const subscription = await this.prisma.subscription.create({
      data: {
        companyId,
        plan,
        status: 'ACTIVA',
        startDate,
        endDate,
        amount,
      },
    });

    await this.prisma.invoice.create({
      data: {
        companyId,
        type: 'SUSCRIPCION',
        amount,
        status: 'PENDIENTE',
      },
    });

    await this.prisma.company.update({ where: { id: companyId }, data: { planType: plan } });

    return subscription;
  }

  async cancel(companyId: string) {
    const active = await this.getCurrent(companyId);
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

  async getCurrent(companyId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        companyId,
        status: 'ACTIVA',
        endDate: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkExpiredSubscriptions(): Promise<number> {
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVA',
        endDate: { lt: new Date() },
      },
      select: { id: true, companyId: true },
    });

    if (expired.length === 0) return 0;

    const ids = expired.map((s) => s.id);
    const companyIds = [...new Set(expired.map((s) => s.companyId))];

    await this.prisma.subscription.updateMany({
      where: { id: { in: ids } },
      data: { status: 'VENCIDA' },
    });

    await this.prisma.company.updateMany({
      where: { id: { in: companyIds } },
      data: { planType: 'FREE' },
    });

    return expired.length;
  }

  async createPreference(companyId: string, plan: PlanType, months: number) {
    const price = PLAN_PRICES[plan];
    if (price === 0) {
      // FREE plan activates immediately
      return { free: true, subscription: await this.activate(companyId, plan, months) };
    }

    const total = price * months;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://logiguay.com.ar';
    const apiUrl = process.env.API_URL ?? 'https://api.logiguay.com.ar';

    const preference = new Preference(this.mp);
    const response = await preference.create({
      body: {
        items: [{
          id: `${plan}-${months}m`,
          title: `${PLAN_LABELS[plan]} · ${months} ${months === 1 ? 'mes' : 'meses'}`,
          quantity: 1,
          unit_price: total,
          currency_id: 'ARS',
        }],
        back_urls: {
          success: `${appUrl}/es/suscripcion?status=success`,
          failure: `${appUrl}/es/suscripcion?status=failure`,
          pending: `${appUrl}/es/suscripcion?status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${apiUrl}/subscriptions/webhook/mp`,
        metadata: { companyId, plan, months },
      },
    });

    return { init_point: response.init_point, sandbox_init_point: response.sandbox_init_point };
  }

  async handleMpWebhook(paymentId: string) {
    try {
      const paymentClient = new Payment(this.mp);
      const payment = await paymentClient.get({ id: paymentId });

      if (payment.status !== 'approved') return { ignored: true };

      const meta = payment.metadata as { company_id?: string; plan?: string; months?: number };
      const { company_id: companyId, plan, months = 1 } = meta ?? {};

      if (!companyId || !plan) {
        this.logger.warn(`MP webhook missing metadata: ${JSON.stringify(meta)}`);
        return { error: 'missing metadata' };
      }

      const subscription = await this.activate(companyId, plan as PlanType, months);
      this.logger.log(`Plan ${plan} activated for company ${companyId} via MP payment ${paymentId}`);
      return { ok: true, subscription };
    } catch (err) {
      this.logger.error(`MP webhook error: ${(err as Error).message}`);
      return { error: (err as Error).message };
    }
  }

  getPlanPrices() {
    return Object.entries(PLAN_PRICES).map(([plan, price]) => ({ plan, price }));
  }
}
