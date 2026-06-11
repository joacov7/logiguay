import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateQuoteDto } from './dto/quote.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuoteDto & { transportCompanyId: string }) {
    const cargo = await this.prisma.cargo.findUnique({ where: { id: dto.cargoId } });
    if (!cargo) throw new NotFoundException('Carga no encontrada');
    if (!['PUBLICADO', 'COTIZANDO'].includes(cargo.status)) {
      throw new BadRequestException('La carga no está disponible para cotización');
    }

    const existing = await this.prisma.quote.findFirst({
      where: {
        cargoId: dto.cargoId,
        transportCompanyId: dto.transportCompanyId,
      },
    });
    if (existing) {
      throw new ConflictException('Esta empresa ya ha cotizado esta carga');
    }

    const quote = await this.prisma.quote.create({
      data: {
        cargoId: dto.cargoId,
        transportCompanyId: dto.transportCompanyId,
        amount: dto.amount,
        notes: dto.notes,
      },
      include: {
        transportCompany: { select: { id: true, name: true } },
        cargo: {
          select: {
            id: true,
            type: true,
            originAddress: true,
            destinationAddress: true,
          },
        },
      },
    });

    if (cargo.status === 'PUBLICADO') {
      await this.prisma.cargo.update({
        where: { id: dto.cargoId },
        data: { status: 'COTIZANDO' },
      });
    }

    return quote;
  }

  async findByCargoId(cargoId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where: { cargoId },
        skip,
        take: limit,
        include: {
          transportCompany: { select: { id: true, name: true, country: true } },
        },
        orderBy: { amount: 'asc' },
      }),
      this.prisma.quote.count({ where: { cargoId } }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findByCompany(companyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where: { transportCompanyId: companyId },
        skip,
        take: limit,
        include: {
          cargo: {
            select: {
              id: true,
              type: true,
              originAddress: true,
              destinationAddress: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quote.count({ where: { transportCompanyId: companyId } }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async accept(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    if (quote.status !== 'PENDIENTE') {
      throw new BadRequestException('Esta cotización ya fue procesada');
    }
    return this.prisma.quote.update({ where: { id }, data: { status: 'ACEPTADA' } });
  }

  async reject(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    if (quote.status !== 'PENDIENTE') {
      throw new BadRequestException('Esta cotización ya fue procesada');
    }
    return this.prisma.quote.update({ where: { id }, data: { status: 'RECHAZADA' } });
  }

  async withdraw(id: string, companyId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    if (quote.transportCompanyId !== companyId) {
      throw new ForbiddenException('No tiene permisos para retirar esta cotización');
    }
    if (quote.status !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden retirar cotizaciones pendientes');
    }
    return this.prisma.quote.delete({ where: { id } });
  }
}
