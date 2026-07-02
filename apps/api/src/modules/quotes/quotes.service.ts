import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { BillingService } from '../billing/billing.service';
import { CreateQuoteDto } from './dto/quote.dto';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly billing: BillingService,
  ) {}

  async create(dto: CreateQuoteDto & { transportCompanyId: string }) {
    if (!dto.transportCompanyId) {
      throw new BadRequestException(
        'Necesitás registrar tu empresa antes de cotizar. Andá a Mi Perfil para crearla.',
      );
    }

    // Bloqueo por mora: el transportista con comisiones impagas vencidas no
    // puede cotizar nuevas cargas hasta regularizar.
    try {
      await this.billing.assertNotDelinquent(dto.transportCompanyId);
    } catch (e: any) {
      if (e?.status) throw e; // re-throw HttpExceptions (ForbiddenException, etc.)
      this.logger.error('Error en assertNotDelinquent', e?.stack ?? e);
      throw new InternalServerErrorException('Error al verificar estado de cuenta');
    }

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

    // Notify dador by email
    try {
      const cargoFull = await this.prisma.cargo.findUnique({
        where: { id: dto.cargoId },
        include: { company: { include: { companyUsers: { include: { user: { select: { email: true, firstName: true } } } } } } },
      });
      const dadoEmail = cargoFull?.company?.companyUsers?.[0]?.user?.email;
      const dadoName = cargoFull?.company?.companyUsers?.[0]?.user?.firstName ?? cargoFull?.company?.name ?? 'Usuario';
      if (dadoEmail) {
        await this.email.sendQuoteReceived({
          to: dadoEmail,
          dadoName,
          transportistaName: quote.transportCompany?.name ?? 'Transportista',
          cargoType: quote.cargo?.type ?? 'Carga',
          origin: quote.cargo?.originAddress ?? '',
          destination: quote.cargo?.destinationAddress ?? '',
          amount: dto.amount,
          cargoId: dto.cargoId,
        });
      }
    } catch (e) {
      this.logger.warn(`Email de cotización recibida no enviado (cargo ${dto.cargoId}): ${(e as Error).message}`);
    }

    return quote;
  }

  async findByCargoId(cargoId: string, companyId: string, role: string, page = 1, limit = 20) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id: cargoId },
      select: { companyId: true },
    });
    if (!cargo) throw new NotFoundException('Carga no encontrada');
    // Solo el dueño de la carga (o ADMIN) ve las cotizaciones recibidas
    if (role !== 'ADMIN' && cargo.companyId !== companyId) {
      throw new ForbiddenException('No tiene permisos sobre esta carga');
    }
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const skip = (p - 1) * l;
    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where: { cargoId },
        skip,
        take: l,
        include: {
          transportCompany: { select: { id: true, name: true, country: true } },
        },
        orderBy: { amount: 'asc' },
      }),
      this.prisma.quote.count({ where: { cargoId } }),
    ]);
    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) };
  }

  async findByCompany(companyId: string, page = 1, limit = 20) {
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const skip = (p - 1) * l;
    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where: { transportCompanyId: companyId },
        skip,
        take: l,
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
    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) };
  }

  async accept(id: string, companyId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        cargo: { select: { id: true, companyId: true, status: true } },
        transportCompany: { select: { id: true, name: true } },
      },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    if (quote.cargo.companyId !== companyId) {
      throw new ForbiddenException('No tiene permisos sobre esta carga');
    }
    if (quote.status !== 'PENDIENTE') {
      throw new BadRequestException('Esta cotización ya fue procesada');
    }
    if (!['PUBLICADO', 'COTIZANDO'].includes(quote.cargo.status)) {
      throw new BadRequestException('La carga ya no está disponible');
    }

    // Bloqueo por mora: el dador con comisiones impagas vencidas no puede
    // cerrar nuevos viajes (aceptar cotizaciones) hasta regularizar.
    await this.billing.assertNotDelinquent(companyId);

    return this.prisma.$transaction(async (tx) => {
      // Updates condicionados: si otro accept/selectQuote concurrente ya
      // procesó la cotización o asignó la carga, count === 0 y abortamos
      // (evita dos viajes para la misma carga).
      const claimedQuote = await tx.quote.updateMany({
        where: { id, status: 'PENDIENTE' },
        data: { status: 'ACEPTADA' },
      });
      if (claimedQuote.count === 0) {
        throw new BadRequestException('Esta cotización ya fue procesada');
      }
      const claimedCargo = await tx.cargo.updateMany({
        where: { id: quote.cargoId, status: { in: ['PUBLICADO', 'COTIZANDO'] } },
        data: { status: 'ASIGNADO' },
      });
      if (claimedCargo.count === 0) {
        throw new BadRequestException('La carga ya no está disponible');
      }
      await tx.quote.updateMany({
        where: { cargoId: quote.cargoId, id: { not: id }, status: 'PENDIENTE' },
        data: { status: 'RECHAZADA' },
      });
      // Estado final conocido localmente: evita un SELECT extra dentro de la
      // transacción que además podría devolver null si el row fue borrado.
      const accepted = { ...quote, status: 'ACEPTADA' as const };
      await tx.trip.create({
        data: {
          cargoId: quote.cargoId,
          transportCompanyId: quote.transportCompanyId,
          agreedRate: quote.amount,
          status: 'ASIGNADO',
        },
      });
      return accepted;
    });
  }

  async reject(id: string, companyId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { cargo: { select: { companyId: true } } },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    if (quote.cargo.companyId !== companyId) {
      throw new ForbiddenException('No tiene permisos sobre esta carga');
    }
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
