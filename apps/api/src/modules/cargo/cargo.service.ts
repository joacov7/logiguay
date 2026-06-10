import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCargoDto, UpdateCargoDto, MarketplaceFilterDto } from './dto/cargo.dto';
import { Prisma } from '@prisma/client';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class CargoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCargoDto) {
    return this.prisma.cargo.create({
      data: {
        ...dto,
        requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : null,
        auctionEndsAt: dto.auctionEndsAt ? new Date(dto.auctionEndsAt) : null,
        status: 'PENDIENTE',
      },
    });
  }

  async findAll(filters: {
    companyId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { companyId, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: Prisma.CargoWhereInput = {};
    if (companyId) where.companyId = companyId;
    if (status) where.status = status as Prisma.EnumCargoStatusFilter;

    const [data, total] = await Promise.all([
      this.prisma.cargo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true } },
          _count: { select: { quotes: true } },
        },
      }),
      this.prisma.cargo.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
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

  async update(id: string, dto: UpdateCargoDto) {
    const cargo = await this.findOne(id);

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

  async publish(id: string) {
    const cargo = await this.findOne(id);
    if (cargo.status !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden publicar cargas en estado PENDIENTE');
    }
    return this.prisma.cargo.update({ where: { id }, data: { status: 'PUBLICADO' } });
  }

  async cancel(id: string) {
    await this.findOne(id);
    return this.prisma.cargo.update({ where: { id }, data: { status: 'CANCELADO' } });
  }

  async remove(id: string) {
    const cargo = await this.findOne(id);
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

    const skip = (page - 1) * limit;

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

    const orderByClause: Prisma.CargoOrderByWithRelationInput =
      orderBy === 'estimatedValue'
        ? { estimatedValue: orderDir }
        : orderBy === 'requiredDate'
        ? { requiredDate: orderDir }
        : { createdAt: orderDir };

    const [data, total] = await Promise.all([
      this.prisma.cargo.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: {
          company: { select: { id: true, name: true, country: true } },
          _count: { select: { quotes: true } },
        },
      }),
      this.prisma.cargo.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
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

  async selectQuote(cargoId: string, quoteId: string) {
    const cargo = await this.findOne(cargoId);

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

    return this.getCargoWithQuotes(cargoId);
  }
}
