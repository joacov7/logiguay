import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar alertas' })
  findAll(
    @Query('companyId') companyId: string,
    @Query('unread') unread?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.alertsService.findAll(companyId, unread === 'true', page, limit);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Conteo de alertas no leídas' })
  getUnreadCount(@Query('companyId') companyId: string) {
    return this.alertsService.getUnreadCount(companyId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar alerta como leída' })
  markAsRead(@Param('id') id: string) {
    return this.alertsService.markAsRead(id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas las alertas como leídas' })
  markAllAsRead(@Query('companyId') companyId: string) {
    return this.alertsService.markAllAsRead(companyId);
  }
}
