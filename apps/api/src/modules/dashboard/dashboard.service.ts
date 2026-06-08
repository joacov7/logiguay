import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKPIs(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeTrips,
      completedTripsMonth,
      pendingCargos,
      pendingAlerts,
      monthlyRevenue,
    ] = await Promise.all([
      this.prisma.vehicle.count({ where: { companyId } }),
      this.prisma.vehicle.count({ where: { companyId, status: 'ACTIVO' } }),
      this.prisma.driver.count({ where: { companyId } }),
      this.prisma.trip.count({
        where: {
          transportCompanyId: companyId,
          status: { in: ['EN_CAMINO_ORIGEN', 'EN_CARGA', 'EN_TRANSITO', 'EN_DESCARGA'] },
        },
      }),
      this.prisma.trip.count({
        where: {
          transportCompanyId: companyId,
          status: 'FINALIZADO',
          finishedAt: { gte: startOfMonth },
        },
      }),
      this.prisma.cargo.count({ where: { companyId, status: 'PENDIENTE' } }),
      this.prisma.alert.count({ where: { companyId, isRead: false } }),
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          status: 'PAGADA',
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      vehicles: { total: totalVehicles, active: activeVehicles },
      drivers: { total: totalDrivers },
      trips: { active: activeTrips, completedThisMonth: completedTripsMonth },
      cargo: { pending: pendingCargos },
      alerts: { unread: pendingAlerts },
      revenue: { thisMonth: monthlyRevenue._sum.amount || 0 },
    };
  }

  async getTripsByStatus(companyId: string) {
    const results = await this.prisma.trip.groupBy({
      by: ['status'],
      where: { transportCompanyId: companyId },
      _count: { status: true },
    });

    return results.map((r) => ({ status: r.status, count: r._count.status }));
  }

  async getMonthlyTrips(companyId: string, months = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const trips = await this.prisma.trip.findMany({
      where: {
        transportCompanyId: companyId,
        createdAt: { gte: startDate },
      },
      select: { createdAt: true, status: true, agreedRate: true },
    });

    const byMonth: Record<string, { trips: number; revenue: number }> = {};

    trips.forEach((t) => {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { trips: 0, revenue: 0 };
      byMonth[key].trips++;
      if (t.status === 'FINALIZADO') byMonth[key].revenue += t.agreedRate || 0;
    });

    return Object.entries(byMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getExpiringDocuments(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId },
      select: { id: true },
    });
    const vehicleIds = vehicles.map((v) => v.id);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return this.prisma.document.findMany({
      where: {
        entityId: { in: vehicleIds },
        expiresAt: { lte: thirtyDaysFromNow, gte: new Date() },
        status: { not: 'VENCIDO' },
      },
      orderBy: { expiresAt: 'asc' },
      take: 10,
    });
  }
}
