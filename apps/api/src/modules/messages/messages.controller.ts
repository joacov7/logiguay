import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Listar conversaciones (viajes con chat)' })
  getConversations(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.messagesService.getConversations(companyId, role);
  }

  @Get('trip/:tripId')
  @ApiOperation({ summary: 'Mensajes de un viaje' })
  getMessages(
    @Param('tripId') tripId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('driverId') driverId: string | null,
  ) {
    return this.messagesService.getMessages(tripId, companyId, role, driverId);
  }

  @Post('trip/:tripId')
  @ApiOperation({ summary: 'Enviar mensaje (la PII se enmascara automáticamente)' })
  sendMessage(
    @Param('tripId') tripId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('driverId') driverId: string | null,
    @Body() body: { body: string },
  ) {
    return this.messagesService.sendMessage(tripId, companyId, userId, role, body?.body, driverId);
  }
}
