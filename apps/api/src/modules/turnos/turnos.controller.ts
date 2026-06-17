import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TurnosService } from './turnos.service';
import { CreateTurnSlotDto, BookTurnSlotDto } from './dto/turnos.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Turnos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Post('slots')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Crear turno (DADOR)' })
  createSlot(@CurrentUser('companyId') companyId: string, @Body() dto: CreateTurnSlotDto) {
    return this.turnosService.createSlot(companyId, dto);
  }

  @Get('slots')
  @ApiOperation({ summary: 'Listar turnos disponibles' })
  getSlots(
    @Query('companyId') companyId?: string,
    @Query('date') date?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.turnosService.getSlots(
      companyId,
      date,
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
      radiusKm ? parseFloat(radiusKm) : 200,
    );
  }

  @Post('slots/:slotId/book')
  @Roles(Role.TRANSPORTISTA, Role.ADMIN)
  @ApiOperation({ summary: 'Reservar turno (TRANSPORTISTA)' })
  bookSlot(
    @Param('slotId') slotId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: BookTurnSlotDto,
  ) {
    return this.turnosService.bookSlot(slotId, companyId, dto);
  }

  @Get('my-bookings')
  @ApiOperation({ summary: 'Mis reservas' })
  getMyBookings(@CurrentUser('companyId') companyId: string) {
    return this.turnosService.getMyBookings(companyId);
  }

  @Patch('bookings/:id/cancel')
  @ApiOperation({ summary: 'Cancelar reserva' })
  cancelBooking(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.turnosService.cancelBooking(id, companyId);
  }

  @Patch('bookings/:id/checkin')
  @ApiOperation({ summary: 'Check-in: chofer marca llegada a la planta' })
  checkIn(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.turnosService.checkIn(id, companyId);
  }

  @Patch('bookings/:id/delay')
  @ApiOperation({ summary: 'Reportar demora estimada' })
  reportDelay(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body: { delayMinutes: number; delayNote?: string },
  ) {
    return this.turnosService.reportDelay(id, companyId, body.delayMinutes, body.delayNote);
  }

  @Patch('bookings/:id/attend')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Planta inicia atención del camión' })
  attendBooking(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.turnosService.attendBooking(id, companyId);
  }

  @Patch('bookings/:id/complete')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Planta marca camión como completado' })
  completeBooking(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.turnosService.completeBooking(id, companyId);
  }

  @Get('slots/:slotId/queue')
  @ApiOperation({ summary: 'Cola en tiempo real de un turno' })
  getQueue(@Param('slotId') slotId: string) {
    return this.turnosService.getQueue(slotId);
  }
}
