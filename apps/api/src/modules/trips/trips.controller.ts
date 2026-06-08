import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripStatusDto, AddTripEventDto } from './dto/trip.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear viaje' })
  create(@Body() dto: CreateTripDto) {
    return this.tripsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar viajes' })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tripsService.findAll({ companyId, status, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener viaje' })
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado del viaje' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTripStatusDto) {
    return this.tripsService.updateStatus(id, dto);
  }

  @Post(':id/events')
  @ApiOperation({ summary: 'Agregar evento al viaje' })
  addEvent(@Param('id') id: string, @Body() dto: AddTripEventDto) {
    return this.tripsService.addEvent(id, dto);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Historial de eventos del viaje' })
  getEvents(@Param('id') id: string) {
    return this.tripsService.getEvents(id);
  }
}
