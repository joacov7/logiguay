import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { companyId: string; tripId?: string; type: string; message: string }) {
    return this.prisma.alert.create({ data });
  }

  async findAll(companyId: string, onlyUnread = false, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (onlyUnread) where.isRead = false;

    const [data, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { trip: { select: { id: true, status: true } } },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async markAsRead(id: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alerta no encontrada');
    return this.prisma.alert.update({ where: { id }, data: { isRead: true } });
  }

  async markAllAsRead(companyId: string) {
    await this.prisma.alert.updateMany({
      where: { companyId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'Todas las alertas marcadas como leídas' };
  }

  async getUnreadCount(companyId: string) {
    const count = await this.prisma.alert.count({ where: { companyId, isRead: false } });
    return { count };
  }
}
