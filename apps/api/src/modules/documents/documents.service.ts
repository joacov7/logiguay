import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AlertsService } from '../alerts/alerts.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { DocumentStatus } from '@prisma/client';

function computeStatus(expiresAt: Date): DocumentStatus {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (expiresAt < now) return DocumentStatus.VENCIDO;
  if (expiresAt < thirtyDaysFromNow) return DocumentStatus.POR_VENCER;
  return DocumentStatus.VIGENTE;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly alertsService: AlertsService,
  ) {}

  async create(dto: CreateDocumentDto) {
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    const status: DocumentStatus = expiresAt ? computeStatus(expiresAt) : DocumentStatus.VIGENTE;

    return this.prisma.document.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        vehicleId: dto.vehicleId ?? null,
        driverId: dto.driverId ?? null,
        type: dto.type,
        fileUrl: dto.fileUrl,
        expiresAt,
        status,
      },
    });
  }

  async findAll(filters: {
    entityType?: string;
    entityId?: string;
    vehicleId?: string;
    driverId?: string;
    status?: string;
    type?: string;
    companyId?: string;
  }) {
    const where: Record<string, unknown> = {};

    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.status) where.status = filters.status as DocumentStatus;
    if (filters.type) where.type = filters.type;

    if (filters.companyId) {
      where.OR = [
        { vehicle: { companyId: filters.companyId } },
        { driver: { companyId: filters.companyId } },
      ];
    }

    return this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true, companyId: true } },
        driver: { select: { id: true, firstName: true, lastName: true, companyId: true } },
      },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true, companyId: true } },
        driver: { select: { id: true, firstName: true, lastName: true, companyId: true } },
      },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto) {
    await this.findOne(id);

    const expiresAt = dto.expiresAt !== undefined ? new Date(dto.expiresAt) : undefined;
    const status = expiresAt ? computeStatus(expiresAt) : undefined;

    return this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.fileUrl !== undefined && { fileUrl: dto.fileUrl }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(expiresAt !== undefined && { expiresAt }),
        ...(status !== undefined && { status }),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    await this.prisma.document.delete({ where: { id } });
    return { message: 'Documento eliminado' };
  }

  async checkExpiries(companyId: string): Promise<{
    total: number;
    recalculated: number;
    vencidos: number;
    porVencer: number;
    vigentes: number;
  }> {
    const documents = await this.prisma.document.findMany({
      where: {
        expiresAt: { not: null },
        OR: [
          { vehicle: { companyId } },
          { driver: { companyId } },
        ],
      },
    });

    let recalculated = 0;
    let vencidos = 0;
    let porVencer = 0;
    let vigentes = 0;

    for (const doc of documents) {
      const newStatus = computeStatus(doc.expiresAt as Date);

      if (newStatus === DocumentStatus.VENCIDO) vencidos++;
      else if (newStatus === DocumentStatus.POR_VENCER) porVencer++;
      else vigentes++;

      if (doc.status !== newStatus) {
        await this.prisma.document.update({
          where: { id: doc.id },
          data: { status: newStatus },
        });
        recalculated++;
      }
    }

    return { total: documents.length, recalculated, vencidos, porVencer, vigentes };
  }

  async getExpiringDocuments(companyId: string, daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.document.findMany({
      where: {
        expiresAt: { not: null, lte: futureDate },
        status: { in: [DocumentStatus.POR_VENCER, DocumentStatus.VENCIDO] },
        OR: [
          { vehicle: { companyId } },
          { driver: { companyId } },
        ],
      },
      orderBy: { expiresAt: 'asc' },
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async generateExpiryAlerts(companyId: string): Promise<number> {
    const documents = await this.getExpiringDocuments(companyId, 30);
    let alertsGenerated = 0;

    for (const doc of documents) {
      if (doc.status !== DocumentStatus.POR_VENCER && doc.status !== DocumentStatus.VENCIDO) {
        continue;
      }

      const redisKey = `doc_alert:${doc.id}`;
      const existing = await this.redis.get(redisKey);
      if (existing) continue;

      const entityLabel =
        doc.vehicle
          ? `Vehículo ${doc.vehicle.plate}`
          : doc.driver
          ? `Chofer ${(doc.driver as { firstName: string; lastName: string }).firstName} ${(doc.driver as { firstName: string; lastName: string }).lastName}`
          : doc.entityId;

      const statusLabel = doc.status === DocumentStatus.VENCIDO ? 'vencido' : 'por vencer';
      const message = `Documento ${doc.type} de ${entityLabel} está ${statusLabel}${doc.expiresAt ? ` (vence: ${doc.expiresAt.toLocaleDateString('es-AR')})` : ''}.`;

      await this.alertsService.create({
        companyId,
        type: 'DOCUMENT_EXPIRY',
        message,
      });

      await this.redis.set(redisKey, '1', 86400);
      alertsGenerated++;
    }

    return alertsGenerated;
  }
}
