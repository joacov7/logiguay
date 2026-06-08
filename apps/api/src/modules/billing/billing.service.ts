import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoiceType, InvoiceStatus } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvoice(data: {
    companyId: string;
    tripId?: string;
    type: InvoiceType;
    amount: number;
  }) {
    return this.prisma.invoice.create({ data });
  }

  async findAll(companyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { companyId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { trip: { select: { id: true, status: true } } },
      }),
      this.prisma.invoice.count({ where: { companyId } }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { trip: true, company: true },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async updateStatus(id: string, status: InvoiceStatus) {
    await this.findOne(id);
    return this.prisma.invoice.update({ where: { id }, data: { status } });
  }

  async getSummary(companyId: string) {
    const [pending, paid, total] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { companyId, status: 'PENDIENTE' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, status: 'PAGADA' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { companyId },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      pending: { count: pending._count, amount: pending._sum.amount || 0 },
      paid: { count: paid._count, amount: paid._sum.amount || 0 },
      total: { count: total._count, amount: total._sum.amount || 0 },
    };
  }

  async calculateTripCommission(tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Viaje no encontrado');

    if (!trip.agreedRate || !trip.commission) return 0;

    if (trip.commissionType === 'PORCENTAJE') {
      return (trip.agreedRate * trip.commission) / 100;
    } else if (trip.commissionType === 'FIJO') {
      return trip.commission;
    } else if (trip.commissionType === 'HIBRIDO') {
      return trip.commission;
    }

    return 0;
  }
}
