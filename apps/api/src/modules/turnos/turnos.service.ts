import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TurnosService {
  constructor(private readonly prisma: PrismaService) {}

  async createSlot(companyId: string, dto: {
    plantName: string;
    address: string;
    lat?: number;
    lng?: number;
    date: string;
    startTime: string;
    endTime: string;
    capacity?: number;
    notes?: string;
  }) {
    return this.prisma.turnSlot.create({
      data: {
        companyId,
        plantName: dto.plantName,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        capacity: dto.capacity ?? 1,
        notes: dto.notes,
      },
      include: { _count: { select: { bookings: true } } },
    });
  }

  async getSlots(companyId?: string, date?: string, lat?: number, lng?: number, radiusKm = 200) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.date = { gte: d, lt: next };
    } else {
      where.date = { gte: new Date() };
    }

    const slots = await this.prisma.turnSlot.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { bookings: true } },
        bookings: { select: { id: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    if (lat != null && lng != null) {
      const R = 6371;
      return slots
        .filter((s) => {
          if (s.lat == null || s.lng == null) return true;
          const dLat = ((s.lat - lat) * Math.PI) / 180;
          const dLng = ((s.lng - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((s.lat * Math.PI) / 180) *
              Math.sin(dLng / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= radiusKm;
        })
        .map((s) => ({
          ...s,
          availableSpots: s.capacity - s._count.bookings,
        }));
    }

    return slots.map((s) => ({
      ...s,
      availableSpots: s.capacity - s._count.bookings,
    }));
  }

  async bookSlot(slotId: string, companyId: string, dto: {
    driverName?: string;
    vehiclePlate?: string;
    notes?: string;
  }) {
    // Use a serializable transaction to prevent double-booking race conditions.
    // The re-check inside the transaction runs under an exclusive lock on the slot's
    // booking count, so concurrent requests cannot both pass the capacity check.
    return this.prisma.$transaction(async (tx) => {
      const slot = await tx.turnSlot.findUnique({
        where: { id: slotId },
        include: { _count: { select: { bookings: { where: { status: { not: 'CANCELADO' } } } } } },
      });
      if (!slot) throw new NotFoundException('Turno no encontrado');

      const activeBookings = slot._count.bookings;
      if (activeBookings >= slot.capacity) {
        throw new BadRequestException('El turno está completo');
      }

      return tx.turnBooking.create({
        data: { slotId, companyId, ...dto, status: 'CONFIRMADO' },
        include: { slot: true },
      });
    }, { isolationLevel: 'Serializable' });
  }

  async getMyBookings(companyId: string) {
    return this.prisma.turnBooking.findMany({
      where: { companyId },
      include: { slot: { include: { company: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelBooking(bookingId: string, companyId: string) {
    const booking = await this.prisma.turnBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.companyId !== companyId) throw new ForbiddenException('Sin acceso');
    return this.prisma.turnBooking.update({
      where: { id: bookingId },
      data: { status: 'CANCELADO' },
    });
  }
}
