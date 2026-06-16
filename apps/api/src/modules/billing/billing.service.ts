import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoiceType, InvoiceStatus } from '@prisma/client';

interface InvoiceFilters {
  type?: InvoiceType;
  status?: InvoiceStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getInvoices(companyId: string, filters: InvoiceFilters = {}) {
    const { type, status, page = 1, limit = 20 } = filters;
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const skip = (p - 1) * l;

    const where = {
      companyId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: { trip: { select: { id: true, status: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) };
  }

  async getInvoice(id: string, companyId?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { trip: true, company: true },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    if (companyId && invoice.companyId !== companyId) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async markAsPaid(id: string, companyId: string) {
    await this.getInvoice(id, companyId);
    return this.prisma.invoice.update({ where: { id }, data: { status: 'PAGADA' } });
  }

  async cancel(id: string, companyId: string) {
    await this.getInvoice(id, companyId);
    return this.prisma.invoice.update({ where: { id }, data: { status: 'CANCELADA' } });
  }

  async getSummary(companyId: string) {
    const [paid, pending, cancelled, byTypeRaw] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { companyId, status: 'PAGADA' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, status: 'PENDIENTE' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, status: 'CANCELADA' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.invoice.groupBy({
        by: ['type'],
        where: { companyId },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const byType = byTypeRaw.reduce<Record<string, { count: number; amount: number }>>(
      (acc, row) => {
        acc[row.type] = {
          count: row._count,
          amount: row._sum.amount ?? 0,
        };
        return acc;
      },
      {},
    );

    return {
      totalPaid: paid._sum.amount ?? 0,
      totalPending: pending._sum.amount ?? 0,
      totalCancelled: cancelled._sum.amount ?? 0,
      countPaid: paid._count,
      countPending: pending._count,
      countCancelled: cancelled._count,
      byType,
    };
  }

  async createManual(
    companyId: string,
    type: InvoiceType,
    amount: number,
    tripId?: string,
  ) {
    await this.assertFiscalDataComplete(companyId);
    return this.prisma.invoice.create({
      data: {
        companyId,
        type,
        amount,
        status: 'PENDIENTE',
        ...(tripId ? { tripId } : {}),
      },
    });
  }

  /** Para facturar se exige razón social, CUIT real y condición fiscal declarada. */
  async assertFiscalDataComplete(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { razonSocial: true, cuit: true, condicionFiscal: true },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const missing: string[] = [];
    if (!company.razonSocial?.trim()) missing.push('razón social');
    if (!company.cuit || company.cuit.startsWith('00-')) missing.push('CUIT');
    if (company.condicionFiscal === 'NO_DECLARADA') missing.push('condición fiscal');

    if (missing.length > 0) {
      throw new BadRequestException(
        `Completá tus datos fiscales (${missing.join(', ')}) en Mi Perfil para poder facturar.`,
      );
    }
  }

  // ── Transportista: financial overview ────────────────────────────────────────

  async getFinanzasResumen(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [thisMon, lastMon, acumulado, pendiente, topViajes, mensualRaw, porVehiculo] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { companyId, type: 'VIAJE', createdAt: { gte: startOfMonth } },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, type: 'VIAJE', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, type: 'VIAJE' },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, type: 'VIAJE', status: 'PENDIENTE' },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.trip.findMany({
        where: { transportCompanyId: companyId, status: 'FINALIZADO', agreedRate: { not: null } },
        orderBy: { agreedRate: 'desc' },
        take: 5,
        include: {
          cargo: { select: { originAddress: true, destinationAddress: true, type: true } },
          vehicle: { select: { plate: true } },
        },
      }),
      this.prisma.invoice.findMany({
        where: { companyId, type: 'VIAJE', createdAt: { gte: sixMonthsAgo } },
        select: { amount: true, createdAt: true },
      }),
      this.prisma.trip.findMany({
        where: { transportCompanyId: companyId, status: 'FINALIZADO', vehicleId: { not: null } },
        select: { agreedRate: true, vehicle: { select: { id: true, plate: true } } },
      }),
    ]);

    // Monthly series (last 6 months)
    const mensual: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      mensual[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    mensualRaw.forEach((inv) => {
      const key = `${inv.createdAt.getFullYear()}-${String(inv.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (key in mensual) mensual[key] += inv.amount;
    });

    // Revenue by vehicle
    const vehicleMap: Record<string, { plate: string; total: number; viajes: number }> = {};
    porVehiculo.forEach((t) => {
      if (!t.vehicle) return;
      const id = t.vehicle.id;
      if (!vehicleMap[id]) vehicleMap[id] = { plate: t.vehicle.plate, total: 0, viajes: 0 };
      vehicleMap[id].total += t.agreedRate ?? 0;
      vehicleMap[id].viajes++;
    });

    const ingresosEsteMes = thisMon._sum.amount ?? 0;

    return {
      ingresosEsteMes,
      ingresosMesAnterior: lastMon._sum.amount ?? 0,
      viajesEsteMes: thisMon._count,
      ingresosAcumulados: acumulado._sum.amount ?? 0,
      totalViajes: acumulado._count,
      pendienteAmount: pendiente._sum.amount ?? 0,
      pendienteCount: pendiente._count,
      ivaDebitoEstimado: Math.round(ingresosEsteMes * 0.105),
      mensual: Object.entries(mensual).map(([month, total]) => ({ month, total })),
      topViajes: topViajes.map((t) => ({
        id: t.id,
        agreedRate: t.agreedRate,
        plate: t.vehicle?.plate,
        origin: t.cargo?.originAddress,
        destination: t.cargo?.destinationAddress,
        cargoType: t.cargo?.type,
      })),
      porVehiculo: Object.values(vehicleMap).sort((a, b) => b.total - a.total).slice(0, 5),
    };
  }

  // ── Admin: platform-wide revenue ─────────────────────────────────────────────

  async getAdminRevenueSummary() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    const startOfYear = new Date();
    startOfYear.setMonth(0, 1); startOfYear.setHours(0, 0, 0, 0);

    const [totalAll, totalMonth, totalYear, byStatus, byType, byPlan, recent] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { type: 'COMISION' },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { type: 'COMISION', createdAt: { gte: startOfMonth } },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { type: 'COMISION', createdAt: { gte: startOfYear } },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { type: 'COMISION' },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.invoice.groupBy({
        by: ['type'],
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.company.groupBy({
        by: ['planType'],
        _count: true,
      }),
      this.prisma.invoice.findMany({
        where: { type: 'COMISION' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          company: { select: { id: true, name: true, planType: true } },
          trip: { select: { id: true, agreedRate: true, status: true } },
        },
      }),
    ]);

    // Monthly breakdown for current year
    const monthly = await this.prisma.$queryRaw<{ month: number; total: number; count: bigint }[]>`
      SELECT EXTRACT(MONTH FROM "created_at")::int AS month,
             SUM(amount) AS total,
             COUNT(*)    AS count
      FROM invoices
      WHERE type = 'COMISION'
        AND "created_at" >= ${startOfYear}
      GROUP BY month
      ORDER BY month
    `;

    return {
      total: totalAll._sum.amount ?? 0,
      totalCount: totalAll._count,
      month: totalMonth._sum.amount ?? 0,
      monthCount: totalMonth._count,
      year: totalYear._sum.amount ?? 0,
      yearCount: totalYear._count,
      byStatus,
      byType,
      byPlan,
      monthly: monthly.map(r => ({ month: r.month, total: Number(r.total), count: Number(r.count) })),
      recent,
    };
  }

  async getAdminComisiones(page = 1, limit = 30, status?: InvoiceStatus) {
    const p = Number(page) || 1;
    const l = Number(limit) || 30;
    const where: any = { type: 'COMISION' };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (p - 1) * l,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true, planType: true } },
          trip: { select: { id: true, agreedRate: true, status: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) };
  }

  async adminMarkPaid(id: string) {
    return this.prisma.invoice.update({ where: { id }, data: { status: 'PAGADA' } });
  }

  // Legacy methods kept for backwards compatibility
  async findAll(companyId: string, page = 1, limit = 20) {
    return this.getInvoices(companyId, { page, limit });
  }

  async findOne(id: string) {
    return this.getInvoice(id);
  }

  async updateStatus(id: string, status: InvoiceStatus) {
    await this.getInvoice(id);
    return this.prisma.invoice.update({ where: { id }, data: { status } });
  }

  async calculateTripCommission(tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Viaje no encontrado');

    if (!trip.agreedRate || !trip.commission) return 0;

    if (trip.commissionType === 'PORCENTAJE') {
      return (trip.agreedRate * trip.commission) / 100;
    } else if (trip.commissionType === 'FIJO' || trip.commissionType === 'HIBRIDO') {
      return trip.commission;
    }

    return 0;
  }
}
