import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      activeUsers,
      totalTrips,
      activeTrips,
      totalCargo,
      subscriptionsByPlan,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.trip.count(),
      this.prisma.trip.count({ where: { status: { notIn: ['FINALIZADO', 'CANCELADO'] } } }),
      this.prisma.cargo.count(),
      this.prisma.company.groupBy({ by: ['planType'], _count: true }),
    ]);

    return {
      companies: { total: totalCompanies, active: activeCompanies },
      users: { total: totalUsers, active: activeUsers },
      trips: { total: totalTrips, active: activeTrips },
      cargo: { total: totalCargo },
      subscriptionsByPlan: subscriptionsByPlan.reduce((acc: any, row: any) => {
        acc[row.planType] = row._count;
        return acc;
      }, {}),
    };
  }

  async getCompanies({ search, type }: { search?: string; type?: string }) {
    const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (type) where.type = type;

    const companies = await this.prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { companyUsers: true, vehicles: true, drivers: true } },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, endDate: true },
        },
      },
    });

    return { data: companies, total: companies.length };
  }

  async updateCompany(id: string, body: any) {
    const allowed = ['name', 'cuit', 'planType', 'isActive', 'country', 'phone', 'address'];
    const data: any = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    const company = await this.prisma.company.update({ where: { id }, data });
    return company;
  }

  async getSubscriptions({ status }: { status?: string }) {
    const where: any = {};
    if (status) where.status = status;

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, cuit: true } },
      },
    });

    return { data: subscriptions, total: subscriptions.length };
  }

  async updateSubscription(id: string, body: any) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');

    const allowed = ['status', 'planType', 'endDate', 'amount'];
    const data: any = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        data[key] = key === 'endDate' ? new Date(body[key]) : body[key];
      }
    }

    // Si se renueva/activa, sincronizar el plan en la empresa también
    if (data.planType) {
      await this.prisma.company.update({
        where: { id: sub.companyId },
        data: { planType: data.planType },
      });
    }

    return this.prisma.subscription.update({ where: { id }, data });
  }

  async getUsers({ search, role }: { search?: string; role?: string }) {
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isActive: true, createdAt: true,
        companyUsers: {
          select: { company: { select: { id: true, name: true } } },
        },
      },
    });

    return { data: users, total: users.length };
  }

  async updateUser(id: string, body: any) {
    const allowed = ['role', 'isActive', 'firstName', 'lastName'];
    const data: any = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    return this.prisma.user.update({ where: { id }, data, select: {
      id: true, email: true, firstName: true, lastName: true, role: true, isActive: true,
    }});
  }

  async resetUserPassword(id: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { password: hashedPassword } });
    return { success: true };
  }
}
