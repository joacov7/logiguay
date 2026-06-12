import { Injectable, NotFoundException } from '@nestjs/common';
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
