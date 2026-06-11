import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AdminUpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly selectFields = {
    id: true,
    email: true,
    role: true,
    firstName: true,
    lastName: true,
    phone: true,
    country: true,
    language: true,
    currency: true,
    timezone: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  };

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: this.selectFields,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.selectFields,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: string, dto: AdminUpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.selectFields,
    });
  }

  async savePushToken(userId: string, token: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
      select: { id: true },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: this.selectFields,
    });
  }

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.selectFields,
        companyUsers: {
          include: {
            company: {
              select: { id: true, name: true, planType: true },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
