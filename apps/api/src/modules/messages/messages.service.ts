import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { maskContactInfo } from './mask-contact.util';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TrackingGateway,
  ) {}

  /**
   * Devuelve el viaje si la empresa participa (dador o transportista) y el
   * estado habilita el chat. Lanza si no tiene acceso.
   */
  private async assertAccess(tripId: string, companyId: string, role: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        status: true,
        transportCompanyId: true,
        cargo: { select: { companyId: true } },
      },
    });
    if (!trip) throw new NotFoundException('Viaje no encontrado');

    const dadorCompanyId = trip.cargo?.companyId;
    const involved =
      role === 'ADMIN' ||
      trip.transportCompanyId === companyId ||
      dadorCompanyId === companyId;
    if (!involved) throw new ForbiddenException('No participás en este viaje');

    return { trip, dadorCompanyId };
  }

  async getMessages(tripId: string, companyId: string, role: string) {
    await this.assertAccess(tripId, companyId, role);

    const messages = await this.prisma.message.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
      include: { senderCompany: { select: { id: true, name: true } } },
    });

    // Marca como leídos los mensajes que NO envié yo
    await this.prisma.message.updateMany({
      where: { tripId, senderCompanyId: { not: companyId }, readAt: null },
      data: { readAt: new Date() },
    });

    return messages;
  }

  async sendMessage(tripId: string, companyId: string, userId: string, role: string, rawBody: string) {
    await this.assertAccess(tripId, companyId, role);

    const trimmed = (rawBody ?? '').trim();
    if (!trimmed) throw new BadRequestException('El mensaje está vacío');
    if (trimmed.length > 2000) throw new BadRequestException('El mensaje es demasiado largo');

    const { masked, hadContact } = maskContactInfo(trimmed);

    const message = await this.prisma.message.create({
      data: {
        tripId,
        senderCompanyId: companyId,
        senderUserId: userId,
        body: masked,
        maskedContact: hadContact,
      },
      include: { senderCompany: { select: { id: true, name: true } } },
    });

    // Emite en tiempo real al room del viaje (ambas partes suscriptas)
    this.gateway.broadcastMessage(tripId, message);

    return message;
  }

  /** Lista de conversaciones (viajes con chat) de la empresa. */
  async getConversations(companyId: string, role: string) {
    const trips = await this.prisma.trip.findMany({
      where:
        role === 'ADMIN'
          ? {}
          : {
              OR: [
                { transportCompanyId: companyId },
                { cargo: { companyId } },
              ],
            },
      select: {
        id: true,
        status: true,
        transportCompanyId: true,
        transportCompany: { select: { id: true, name: true } },
        cargo: {
          select: {
            originAddress: true,
            destinationAddress: true,
            company: { select: { id: true, name: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderCompanyId: true },
        },
        _count: {
          select: { messages: { where: { senderCompanyId: { not: companyId }, readAt: null } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return trips.map((t) => ({
      tripId: t.id,
      status: t.status,
      counterpart:
        t.cargo?.company?.id === companyId
          ? t.transportCompany ?? null
          : t.cargo?.company ?? null,
      origin: t.cargo?.originAddress ?? null,
      destination: t.cargo?.destinationAddress ?? null,
      lastMessage: t.messages[0] ?? null,
      unread: t._count.messages,
    }));
  }
}
