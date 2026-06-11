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
}
