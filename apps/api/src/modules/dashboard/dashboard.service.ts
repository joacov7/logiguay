import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TripStatus } from '@prisma/client';

const ACTIVE_TRIP_STATUSES: TripStatus[] = [
  TripStatus.ASIGNADO,
  TripStatus.EN_CAMINO_ORIGEN,
  TripStatus.EN_CARGA,
  TripStatus.EN_TRANSITO,
  TripStatus.EN_DESCARGA,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(companyId?: string, role?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const tripWhere: Record<string, any> = {};
    const cargoWhere: Record<string, any> = {};
    const vehicleWhere: Record<string, any> = {};
    const driverWhere: Record<string, any> = {};
    const alertWhere: Record<string, any> = {};
    const invoiceWhere: Record<string, any> = {};

    if (companyId && role === 'DADOR') {
      tripWhere.cargo = { companyId };
      cargoWhere.companyId = companyId;
      alertWhere.companyId = companyId;
      invoiceWhere.companyId = companyId;
      // DADORs don't own vehicles — force empty fleet filters so counts = 0
      vehicleWhere.companyId = 'none';
      driverWhere.companyId = 'none';
    } else if (companyId) {
      tripWhere.transportCompanyId = companyId;
      vehicleWhere.companyId = companyId;
      driverWhere.companyId = companyId;
      alertWhere.companyId = companyId;
      invoiceWhere.companyId = companyId;
    }

    const [
      tripsActive,
      tripsFinalized,
      tripsCancelled,
      tripsThisMonth,
      tripsLastMonth,
      tripsByStatus,
      cargoTotal,
      cargoPublished,
      cargoMarketplace,
      cargoThisMonth,
      invoiceTotalRevenue,
      invoicePendingRevenue,
      invoiceTotalCommissions,
      invoicePendingCommissions,
      invoiceThisMonth,
      invoiceLastMonth,
      vehicleTotal,
      vehicleActive,
      driverTotal,
      driverActive,
      avgDeliveryTrips,
      weightTrips,
      alertsUnread,
      recentTrips,
      expiringDocuments,
    ] = await Promise.all([
      this.prisma.trip.count({ where: { ...tripWhere, status: { in: ACTIVE_TRIP_STATUSES } } }),
      this.prisma.trip.count({ where: { ...tripWhere, status: 'FINALIZADO' } }),
      this.prisma.trip.count({ where: { ...tripWhere, status: 'CANCELADO' } }),
      this.prisma.trip.count({ where: { ...tripWhere, createdAt: { gte: startOfMonth } } }),
      this.prisma.trip.count({ where: { ...tripWhere, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      this.prisma.trip.groupBy({ by: ['status'], where: tripWhere, _count: { status: true } }),
      this.prisma.cargo.count({ where: cargoWhere }),
      this.prisma.cargo.count({ where: { ...cargoWhere, status: 'PUBLICADO' } }),
      this.prisma.cargo.count({ where: { ...cargoWhere, status: { in: ['PUBLICADO', 'COTIZANDO'] } } }),
      this.prisma.cargo.count({ where: { ...cargoWhere, createdAt: { gte: startOfMonth } } }),
      this.prisma.invoice.aggregate({ where: { ...invoiceWhere, status: 'PAGADA', type: 'VIAJE' }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { ...invoiceWhere, status: 'PENDIENTE', type: 'VIAJE' }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { ...invoiceWhere, status: 'PAGADA', type: 'COMISION' }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { ...invoiceWhere, status: 'PENDIENTE', type: 'COMISION' }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { ...invoiceWhere, status: 'PAGADA', type: 'VIAJE', createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { ...invoiceWhere, status: 'PAGADA', type: 'VIAJE', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { amount: true } }),
      this.prisma.vehicle.count({ where: vehicleWhere }),
      this.prisma.vehicle.count({ where: { ...vehicleWhere, status: 'ACTIVO' } }),
      this.prisma.driver.count({ where: driverWhere }),
      this.prisma.driver.count({ where: { ...driverWhere, status: 'ACTIVO' } }),
      this.prisma.trip.findMany({ where: { ...tripWhere, status: 'FINALIZADO', startedAt: { not: null }, finishedAt: { not: null } }, select: { startedAt: true, finishedAt: true } }),
      this.prisma.trip.findMany({ where: { ...tripWhere, status: 'FINALIZADO' }, select: { cargo: { select: { weightTons: true } } } }),
      this.prisma.alert.count({ where: { ...alertWhere, isRead: false } }),
      this.prisma.trip.findMany({ where: tripWhere, orderBy: { createdAt: 'desc' }, take: 5, include: { cargo: true, vehicle: true, driver: { include: { user: true } } } }),
      this.prisma.document.findMany({ where: { expiresAt: { gte: now } }, orderBy: { expiresAt: 'asc' }, take: 5 }),
    ]);

    const [vehiclesOnTripResult, driversOnTripResult] = await Promise.all([
      this.prisma.trip.findMany({ where: { ...tripWhere, status: { in: ACTIVE_TRIP_STATUSES } }, select: { vehicleId: true }, distinct: ['vehicleId'] }),
      this.prisma.trip.findMany({ where: { ...tripWhere, status: { in: ACTIVE_TRIP_STATUSES } }, select: { driverId: true }, distinct: ['driverId'] }),
    ]);

    const vehiclesOnTrip = vehiclesOnTripResult.filter((t) => t.vehicleId).length;
    const driversOnTrip = driversOnTripResult.filter((t) => t.driverId).length;

    const validDeliveries = avgDeliveryTrips.filter((t) => t.startedAt && t.finishedAt);
    let avgDeliveryHours = 0;
    if (validDeliveries.length > 0) {
      const totalMs = validDeliveries.reduce((sum, t) => sum + (t.finishedAt!.getTime() - t.startedAt!.getTime()), 0);
      avgDeliveryHours = totalMs / validDeliveries.length / (1000 * 60 * 60);
    }

    const totalWeightTons = weightTrips.reduce((sum, t) => sum + ((t.cargo as any)?.weightTons || 0), 0);

    const byStatus: Record<string, number> = {};
    tripsByStatus.forEach((r) => { byStatus[r.status] = r._count.status; });

    const fleetUtilization = vehicleActive > 0 ? (vehiclesOnTrip / vehicleActive) * 100 : 0;

    return {
      trips: {
        active: tripsActive,
        finalized: tripsFinalized,
        cancelled: tripsCancelled,
        thisMonth: tripsThisMonth,
        lastMonth: tripsLastMonth,
        byStatus,
      },
      cargo: {
        total: cargoTotal,
        published: cargoPublished,
        marketplace: cargoMarketplace,
        thisMonth: cargoThisMonth,
      },
      billing: {
        totalRevenue: invoiceTotalRevenue._sum.amount || 0,
        pendingRevenue: invoicePendingRevenue._sum.amount || 0,
        totalCommissions: invoiceTotalCommissions._sum.amount || 0,
        pendingCommissions: invoicePendingCommissions._sum.amount || 0,
        thisMonth: invoiceThisMonth._sum.amount || 0,
        lastMonth: invoiceLastMonth._sum.amount || 0,
      },
      fleet: {
        total: vehicleTotal,
        active: vehicleActive,
        onTrip: vehiclesOnTrip,
        utilization: Math.round(fleetUtilization * 10) / 10,
      },
      drivers: {
        total: driverTotal,
        active: driverActive,
        onTrip: driversOnTrip,
      },
      logistics: {
        avgDeliveryHours: Math.round(avgDeliveryHours * 10) / 10,
        totalWeightTons: Math.round(totalWeightTons * 100) / 100,
        alertsUnread,
      },
      recentTrips,
      expiringDocuments,
    };
  }

  async getTripTimeSeries(companyId?: string, months = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const tripWhere: Record<string, any> = { createdAt: { gte: startDate } };
    if (companyId) tripWhere.transportCompanyId = companyId;

    const trips = await this.prisma.trip.findMany({
      where: tripWhere,
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
}
