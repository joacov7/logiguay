import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

// Categories each role rates
const TRANSPORTISTA_CATS = ['puntualidad', 'cuidadoCarga', 'comunicacion', 'estadoVehiculo', 'documentacion'] as const;
const DADOR_CATS = ['puntualidadCarga', 'condicionesLugar', 'pagoTiempo', 'tratoPersonal'] as const;

type TransportistaCat = typeof TRANSPORTISTA_CATS[number];
type DadorCat = typeof DADOR_CATS[number];

export interface CreateRatingDto {
  tripId: string;
  toUserId: string;
  toCompanyId?: string;
  comment?: string;
  // Categories for transportista (rated by dador)
  puntualidad?: number;
  cuidadoCarga?: number;
  comunicacion?: number;
  estadoVehiculo?: number;
  documentacion?: number;
  // Categories for dador (rated by transportista)
  puntualidadCarga?: number;
  condicionesLugar?: number;
  pagoTiempo?: number;
  tratoPersonal?: number;
}

function average(values: (number | undefined | null)[]): number {
  const valid = values.filter((v): v is number => v != null && v >= 1 && v <= 5);
  if (valid.length === 0) return 0;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

function validateCat(val: number | undefined, name: string) {
  if (val === undefined || val === null) return;
  if (!Number.isInteger(val) || val < 1 || val > 5) {
    throw new BadRequestException(`${name} debe ser un entero entre 1 y 5`);
  }
}

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(fromUserId: string, dto: CreateRatingDto) {
    const { tripId, toCompanyId, comment, ...cats } = dto;
    let { toUserId } = dto;

    // Validate all category scores
    const allCats = [...TRANSPORTISTA_CATS, ...DADOR_CATS];
    for (const cat of allCats) {
      validateCat((cats as any)[cat], cat);
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { cargo: { select: { companyId: true } } },
    });
    if (!trip) throw new NotFoundException('Viaje no encontrado');
    if (trip.status !== 'FINALIZADO') {
      throw new BadRequestException('Solo se puede calificar un viaje finalizado');
    }

    // Si el frontend no pudo determinar el usuario destino (ej: el viaje no tiene
    // chofer asignado), lo resolvemos desde la empresa destino para no fallar.
    if (!toUserId && toCompanyId) {
      const member = await this.prisma.companyUser.findFirst({
        where: { companyId: toCompanyId },
        orderBy: { userId: 'asc' },
        select: { userId: true },
      });
      toUserId = member?.userId ?? '';
    }
    if (!toUserId) {
      throw new BadRequestException('No se pudo determinar a quién calificar');
    }

    const existing = await this.prisma.rating.findUnique({
      where: { tripId_fromUserId: { tripId, fromUserId } },
    });
    if (existing) throw new ConflictException('Ya calificaste este viaje');

    const fromUser = await this.prisma.user.findUnique({
      where: { id: fromUserId },
      select: { role: true },
    });
    const role = fromUser?.role ?? 'DADOR';

    // Compute overall score from whichever categories were filled
    const catValues = role === 'DADOR'
      ? TRANSPORTISTA_CATS.map((c) => (cats as any)[c] as number | undefined)
      : DADOR_CATS.map((c) => (cats as any)[c] as number | undefined);

    const score = catValues.some((v) => v != null) ? Math.round(average(catValues)) || 3 : 3;

    return this.prisma.rating.create({
      data: {
        tripId,
        fromUserId,
        toUserId,
        toCompanyId: toCompanyId ?? null,
        score,
        comment: comment ?? null,
        role,
        // Transportista categories
        puntualidad: cats.puntualidad ?? null,
        cuidadoCarga: cats.cuidadoCarga ?? null,
        comunicacion: cats.comunicacion ?? null,
        estadoVehiculo: cats.estadoVehiculo ?? null,
        documentacion: cats.documentacion ?? null,
        // Dador categories
        puntualidadCarga: cats.puntualidadCarga ?? null,
        condicionesLugar: cats.condicionesLugar ?? null,
        pagoTiempo: cats.pagoTiempo ?? null,
        tratoPersonal: cats.tratoPersonal ?? null,
      },
    });
  }

  async getByUser(userId: string) {
    const ratings = await this.prisma.rating.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true, role: true } },
        trip: { select: { id: true } },
      },
    });
    return this.buildSummary(ratings);
  }

  async getByCompany(companyId: string) {
    const ratings = await this.prisma.rating.findMany({
      where: { toCompanyId: companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true, role: true } },
        trip: { select: { id: true } },
      },
    });
    return this.buildSummary(ratings);
  }

  private buildSummary(ratings: any[]) {
    const total = ratings.length;
    const avg = (field: string) => {
      const vals = ratings.map((r) => r[field]).filter((v) => v != null);
      return vals.length > 0 ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10 : null;
    };

    const overall = total > 0
      ? Math.round((ratings.reduce((s, r) => s + r.score, 0) / total) * 10) / 10
      : 0;

    // Distribution
    const dist = [1, 2, 3, 4, 5].reduce<Record<number, number>>((acc, n) => {
      acc[n] = ratings.filter((r) => r.score === n).length;
      return acc;
    }, {});

    return {
      ratings,
      average: overall,
      total,
      distribution: dist,
      categorias: {
        // Transportista
        puntualidad: avg('puntualidad'),
        cuidadoCarga: avg('cuidadoCarga'),
        comunicacion: avg('comunicacion'),
        estadoVehiculo: avg('estadoVehiculo'),
        documentacion: avg('documentacion'),
        // Dador
        puntualidadCarga: avg('puntualidadCarga'),
        condicionesLugar: avg('condicionesLugar'),
        pagoTiempo: avg('pagoTiempo'),
        tratoPersonal: avg('tratoPersonal'),
      },
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

  // Quick average for display in lists (bolsa, camiones, etc.)
  async getCompanyAverage(companyId: string): Promise<{ average: number; total: number }> {
    const result = await this.prisma.rating.aggregate({
      where: { toCompanyId: companyId },
      _avg: { score: true },
      _count: true,
    });
    return {
      average: Math.round((result._avg.score ?? 0) * 10) / 10,
      total: result._count,
    };
  }
}
