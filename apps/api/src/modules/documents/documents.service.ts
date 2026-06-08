import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDocumentDto) {
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    let status = 'VIGENTE';
    if (expiresAt) {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      if (expiresAt < now) status = 'VENCIDO';
      else if (expiresAt < thirtyDaysFromNow) status = 'POR_VENCER';
    }

    return this.prisma.document.create({
      data: {
        ...dto,
        expiresAt,
        status: status as any,
      },
    });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.document.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.document.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.document.count(),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto) {
    await this.findOne(id);
    return this.prisma.document.update({
      where: { id },
      data: {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async syncExpiryStatuses() {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    await this.prisma.document.updateMany({
      where: { expiresAt: { lt: now }, status: { not: 'VENCIDO' } },
      data: { status: 'VENCIDO' },
    });

    await this.prisma.document.updateMany({
      where: {
        expiresAt: { gte: now, lt: thirtyDaysFromNow },
        status: { not: 'VENCIDO' },
      },
      data: { status: 'POR_VENCER' },
    });

    return { message: 'Estados actualizados' };
  }

  async getExpiring(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.document.findMany({
      where: {
        expiresAt: { lte: futureDate, gte: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }
}
