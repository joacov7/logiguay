import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(fromUserId: string, dto: { tripId: string; toUserId: string; score: number; comment?: string }) {
    const { tripId, toUserId, score, comment } = dto;

    if (score < 1 || score > 5 || !Number.isInteger(score)) {
      throw new BadRequestException('El puntaje debe ser un entero entre 1 y 5');
    }

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Viaje no encontrado');
    if (trip.status !== 'FINALIZADO') {
      throw new BadRequestException('Solo se puede calificar un viaje finalizado');
    }

    const existing = await this.prisma.rating.findUnique({
      where: { tripId_fromUserId: { tripId, fromUserId } },
    });
    if (existing) throw new ConflictException('Ya calificaste este viaje');

    // Determine role based on who is rating
    const fromUser = await this.prisma.user.findUnique({ where: { id: fromUserId }, select: { role: true } });
    const role = fromUser?.role ?? 'DADOR';

    return this.prisma.rating.create({
      data: { tripId, fromUserId, toUserId, score, comment, role },
    });
  }

  async getByUser(userId: string) {
    const ratings = await this.prisma.rating.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        trip: { select: { id: true } },
      },
    });

    const total = ratings.length;
    const average = total > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / total : 0;

    return {
      ratings,
      average: Math.round(average * 10) / 10,
      total,
    };
  }

  async getByTrip(tripId: string) {
    return this.prisma.rating.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async hasRated(tripId: string, fromUserId: string): Promise<boolean> {
    const existing = await this.prisma.rating.findUnique({
      where: { tripId_fromUserId: { tripId, fromUserId } },
    });
    return !!existing;
  }
}
