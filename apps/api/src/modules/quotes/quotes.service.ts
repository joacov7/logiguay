import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateQuoteDto, UpdateQuoteStatusDto } from './dto/quote.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuoteDto) {
    const cargo = await this.prisma.cargo.findUnique({ where: { id: dto.cargoId } });
    if (!cargo) throw new NotFoundException('Carga no encontrada');
    if (!['PUBLICADO', 'COTIZANDO'].includes(cargo.status)) {
      throw new BadRequestException('La carga no está disponible para cotización');
    }

    const quote = await this.prisma.quote.create({
      data: dto,
      include: {
        transportCompany: { select: { id: true, name: true } },
        cargo: { select: { id: true, type: true, originAddress: true, destinationAddress: true } },
      },
    });

    if (cargo.status === 'PUBLICADO') {
      await this.prisma.cargo.update({ where: { id: dto.cargoId }, data: { status: 'COTIZANDO' } });
    }

    return quote;
  }

  async findByCargo(cargoId: string) {
    return this.prisma.quote.findMany({
      where: { cargoId },
      include: { transportCompany: { select: { id: true, name: true, country: true } } },
      orderBy: { amount: 'asc' },
    });
  }

  async findByCompany(transportCompanyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where: { transportCompanyId },
        skip,
        take: limit,
        include: { cargo: { select: { id: true, type: true, originAddress: true, destinationAddress: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quote.count({ where: { transportCompanyId } }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async updateStatus(id: string, dto: UpdateQuoteStatusDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    if (quote.status !== 'PENDIENTE') {
      throw new BadRequestException('Esta cotización ya fue procesada');
    }

    const updated = await this.prisma.quote.update({ where: { id }, data: { status: dto.status } });

    if (dto.status === 'ACEPTADA') {
      await this.prisma.quote.updateMany({
        where: { cargoId: quote.cargoId, id: { not: id } },
        data: { status: 'RECHAZADA' },
      });

      await this.prisma.cargo.update({ where: { id: quote.cargoId }, data: { status: 'ASIGNADO' } });

      await this.prisma.trip.create({
        data: {
          cargoId: quote.cargoId,
          transportCompanyId: quote.transportCompanyId,
          agreedRate: quote.amount,
          status: 'ASIGNADO',
        },
      });
    }

    return updated;
  }
}
