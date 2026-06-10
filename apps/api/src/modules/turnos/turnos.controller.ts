import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TurnosService } from './turnos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Turnos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Post('slots')
  @ApiOperation({ summary: 'Crear turno (DADOR)' })
  createSlot(@CurrentUser('companyId') companyId: string, @Body() dto: any) {
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
  @ApiOperation({ summary: 'Reservar turno (TRANSPORTISTA)' })
  bookSlot(
    @Param('slotId') slotId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: any,
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
}
