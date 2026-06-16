import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EmailService } from '../../common/email/email.service';
import { CreateCargoDto, UpdateCargoDto, MarketplaceFilterDto } from './dto/cargo.dto';
import { Prisma } from '@prisma/client';

export interface RequestUser {
  companyId?: string | null;
  role?: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class CargoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
    private readonly email: EmailService,
  ) {}

  async create(dto: CreateCargoDto & { companyId: string }) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthlyCount = await this.prisma.cargo.count({
      where: { companyId: dto.companyId, createdAt: { gte: startOfMonth } },
    });
    await this.subscriptions.checkLimit(dto.companyId, 'maxMonthlyPublications', monthlyCount);
    return this.prisma.cargo.create({
      data: {
        ...dto,
        requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : null,
        auctionEndsAt: dto.auctionEndsAt ? new Date(dto.auctionEndsAt) : null,
        status: 'PUBLICADO',
      },
    });
  }

  async findAll(filters: {
    companyId?: string;
    status?: string;
    page?: number;
    limit?: number;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    province?: string;
  }) {
    const { companyId, status, page = 1, limit = 20, lat, lng, radiusKm, province } = filters;
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const skip = (p - 1) * l;
    const where: Prisma.CargoWhereInput = {};
    if (companyId) where.companyId = companyId;
    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      where.status = statuses.length === 1
        ? statuses[0] as Prisma.EnumCargoStatusFilter
        : { in: statuses } as Prisma.EnumCargoStatusFilter;
    }
    if (province) where.originAddress = { contains: province, mode: 'insensitive' };

    const geoActive = lat !== undefined && lng !== undefined;

    const [rawData, total] = await Promise.all([
      this.prisma.cargo.findMany({
        where,
        skip: geoActive ? 0 : skip,
        take: geoActive ? undefined : l,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true } },
          _count: { select: { quotes: true } },
        },
      }),
      this.prisma.cargo.count({ where }),
    ]);

    if (geoActive) {
      let annotated = rawData.map((cargo) => ({
        ...cargo,
        distanceKm:
          cargo.originLat != null && cargo.originLng != null
            ? Math.round(haversineKm(lat!, lng!, cargo.originLat, cargo.originLng) * 10) / 10
            : null,
      }));

      if (radiusKm !== undefined) {
        annotated = annotated.filter((c) => c.distanceKm === null || c.distanceKm <= radiusKm);
      }

      annotated.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });

      const filteredTotal = annotated.length;
      const data = annotated.slice(skip, skip + l);
      return { data, total: filteredTotal, page: p, limit: l, pages: Math.ceil(filteredTotal / l) };
    }

    return { data: rawData, total, page: p, limit: l, pages: Math.ceil(total / l) };
  }

  async findOne(id: string) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id },
      include: {
        company: true,
        trips: { include: { driver: true, vehicle: true } },
        quotes: { include: { transportCompany: { select: { id: true, name: true } } } },
      },
    });
    if (!cargo) throw new NotFoundException('Carga no encontrada');
    return cargo;
  }

  // Toda operación de escritura exige que la carga pertenezca a la empresa del usuario (salvo ADMIN)
  private assertOwnership(cargo: { companyId: string }, user?: RequestUser) {
    if (!user || user.role === 'ADMIN') return;
    if (!user.companyId || cargo.companyId !== user.companyId) {
      throw new ForbiddenException('No tenés acceso a esta carga');
    }
  }

  async update(id: string, dto: UpdateCargoDto, user?: RequestUser) {
    const cargo = await this.findOne(id);
    this.assertOwnership(cargo, user);

    if (cargo.status !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden editar cargas en estado PENDIENTE');
    }

    return this.prisma.cargo.update({
      where: { id },
      data: {
        ...dto,
        requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : undefined,
        auctionEndsAt: dto.auctionEndsAt ? new Date(dto.auctionEndsAt) : undefined,
      },
    });
  }

  async publish(id: string, user?: RequestUser) {
    const cargo = await this.findOne(id);
    this.assertOwnership(cargo, user);
    if (cargo.status !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden publicar cargas en estado PENDIENTE');
    }
    return this.prisma.cargo.update({ where: { id }, data: { status: 'PUBLICADO' } });
  }

  async cancel(id: string, user?: RequestUser) {
    const cargo = await this.findOne(id);
    this.assertOwnership(cargo, user);
    return this.prisma.cargo.update({ where: { id }, data: { status: 'CANCELADO' } });
  }

  async remove(id: string, user?: RequestUser) {
    const cargo = await this.findOne(id);
    this.assertOwnership(cargo, user);
    if (cargo.status !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden eliminar cargas en estado PENDIENTE');
    }
    return this.prisma.cargo.delete({ where: { id } });
  }

  async getMarketplace(filters: MarketplaceFilterDto) {
    const {
      type,
      minWeight,
      maxWeight,
      minValue,
      maxValue,
      requiredDateFrom,
      requiredDateTo,
      search,
      orderBy = 'createdAt',
      orderDir = 'desc',
      page = 1,
      limit = 20,
      lat,
      lng,
      radiusKm,
      province,
    } = filters;

    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const skip = (p - 1) * l;

    const where: Prisma.CargoWhereInput = {
      status: { in: ['PUBLICADO', 'COTIZANDO'] },
    };

    if (type) where.type = { contains: type, mode: 'insensitive' };
    if (minWeight !== undefined || maxWeight !== undefined) {
      where.weightTons = {};
      if (minWeight !== undefined) (where.weightTons as Prisma.FloatNullableFilter).gte = minWeight;
      if (maxWeight !== undefined) (where.weightTons as Prisma.FloatNullableFilter).lte = maxWeight;
    }
    if (minValue !== undefined || maxValue !== undefined) {
      where.estimatedValue = {};
      if (minValue !== undefined) (where.estimatedValue as Prisma.FloatNullableFilter).gte = minValue;
      if (maxValue !== undefined) (where.estimatedValue as Prisma.FloatNullableFilter).lte = maxValue;
    }
    if (requiredDateFrom || requiredDateTo) {
      where.requiredDate = {};
      if (requiredDateFrom) (where.requiredDate as Prisma.DateTimeNullableFilter).gte = new Date(requiredDateFrom);
      if (requiredDateTo) (where.requiredDate as Prisma.DateTimeNullableFilter).lte = new Date(requiredDateTo);
    }
    if (search) {
      where.OR = [
        { type: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { originAddress: { contains: search, mode: 'insensitive' } },
        { destinationAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (province) {
      where.originAddress = { contains: province, mode: 'insensitive' };
    }

    const geoActive = lat !== undefined && lng !== undefined;

    const orderByClause: Prisma.CargoOrderByWithRelationInput =
      geoActive
        ? { createdAt: 'desc' }
        : orderBy === 'estimatedValue'
        ? { estimatedValue: orderDir }
        : orderBy === 'requiredDate'
        ? { requiredDate: orderDir }
        : { createdAt: orderDir };

    const [rawData, total] = await Promise.all([
      this.prisma.cargo.findMany({
        where,
        // When geo-filtering we fetch all matching records to sort/filter by distance
        skip: geoActive ? 0 : skip,
        take: geoActive ? undefined : l,
        orderBy: orderByClause,
        include: {
          company: { select: { id: true, name: true, country: true } },
          _count: { select: { quotes: true } },
        },
      }),
      this.prisma.cargo.count({ where }),
    ]);

    if (geoActive) {
      // Annotate with distance
      let annotated = rawData.map((cargo) => ({
        ...cargo,
        distanceKm:
          cargo.originLat != null && cargo.originLng != null
            ? Math.round(haversineKm(lat!, lng!, cargo.originLat, cargo.originLng) * 10) / 10
            : null,
      }));

      // Filter by radius
      if (radiusKm !== undefined) {
        annotated = annotated.filter(
          (c) => c.distanceKm === null || c.distanceKm <= radiusKm,
        );
      }

      // Sort by distance ascending (nulls last)
      annotated.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });

      const filteredTotal = annotated.length;
      const data = annotated.slice(skip, skip + l);
      return { data, total: filteredTotal, page: p, limit: l, pages: Math.ceil(filteredTotal / l) };
    }

    return { data: rawData, total, page: p, limit: l, pages: Math.ceil(total / l) };
  }

  async getRetorno(lat: number, lng: number, radiusKm = 150) {
    const cargos = await this.prisma.cargo.findMany({
      where: {
        status: { in: ['PUBLICADO', 'COTIZANDO'] },
        originLat: { not: null },
        originLng: { not: null },
      },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { quotes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const R = 6371;
    const withDist = cargos
      .map((c) => {
        const dLat = ((c.originLat! - lat) * Math.PI) / 180;
        const dLng = ((c.originLng! - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((c.originLat! * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...c, distKm };
      })
      .filter((c) => c.distKm <= radiusKm)
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 20);

    return withDist;
  }

  async getCargoWithQuotes(id: string) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        quotes: {
          include: { transportCompany: { select: { id: true, name: true, country: true } } },
          orderBy: { amount: 'asc' },
        },
        _count: { select: { quotes: true } },
      },
    });
    if (!cargo) throw new NotFoundException('Carga no encontrada');
    return cargo;
  }

  async selectQuote(cargoId: string, quoteId: string, user?: RequestUser) {
    const cargo = await this.findOne(cargoId);
    this.assertOwnership(cargo, user);

    if (!['PUBLICADO', 'COTIZANDO'].includes(cargo.status)) {
      throw new BadRequestException('La carga no está en un estado válido para seleccionar cotización');
    }

    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    if (quote.cargoId !== cargoId) throw new BadRequestException('La cotización no pertenece a esta carga');

    await this.prisma.$transaction([
      this.prisma.quote.update({ where: { id: quoteId }, data: { status: 'ACEPTADA' } }),
      this.prisma.quote.updateMany({
        where: { cargoId, id: { not: quoteId } },
        data: { status: 'RECHAZADA' },
      }),
      this.prisma.cargo.update({ where: { id: cargoId }, data: { status: 'ASIGNADO' } }),
      this.prisma.trip.create({
        data: {
          cargoId,
          transportCompanyId: quote.transportCompanyId,
          agreedRate: quote.amount,
          status: 'ASIGNADO',
        },
      }),
    ]);

    // Notify transportista by email
    try {
      const transportCompany = await this.prisma.company.findUnique({
        where: { id: quote.transportCompanyId },
        include: { companyUsers: { include: { user: { select: { email: true, firstName: true } } } } },
      });
      const dadoCompany = cargo.company as any;
      const transportEmail = transportCompany?.companyUsers?.[0]?.user?.email;
      const transportName = transportCompany?.companyUsers?.[0]?.user?.firstName ?? transportCompany?.name ?? 'Transportista';
      if (transportEmail) {
        await this.email.sendQuoteAccepted({
          to: transportEmail,
          transportistaName: transportName,
          dadoName: dadoCompany?.name ?? 'Dador de carga',
          cargoType: cargo.type ?? 'Carga',
          origin: cargo.originAddress ?? '',
          destination: cargo.destinationAddress ?? '',
          amount: quote.amount,
          tripId: '',
        });
      }
    } catch (_) {}

    return this.getCargoWithQuotes(cargoId);
  }
}
