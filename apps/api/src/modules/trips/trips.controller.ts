import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TripStatus } from '@prisma/client';
import { TripsService } from './trips.service';
import {
  CreateTripDto,
  UpdateTripStatusDto,
  AddTripEventDto,
  AssignTripDto,
  CancelTripDto,
} from './dto/trip.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @Roles('DADOR', 'ADMIN')
  @ApiOperation({ summary: 'Crear viaje a partir de una carga' })
  create(@Body() dto: CreateTripDto) {
    return this.tripsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar viajes con filtros' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'cargoCompanyId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TripStatus })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('cargoCompanyId') cargoCompanyId?: string,
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tripsService.findAll({ companyId, cargoCompanyId, status, driverId, vehicleId, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un viaje' })
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id);
  }

  @Get(':id/eta')
  @ApiOperation({ summary: 'ETA actual del viaje' })
  getEta(@Param('id') id: string) {
    return this.tripsService.getEta(id);
  }

  @Patch(':id/assign')
  @Roles('TRANSPORTISTA', 'ADMIN')
  @ApiOperation({ summary: 'Asignar vehículo y chofer al viaje' })
  assign(@Param('id') id: string, @Body() dto: AssignTripDto) {
    return this.tripsService.assign(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Avanzar estado del viaje' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTripStatusDto) {
    return this.tripsService.updateStatus(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar viaje' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelTripDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tripsService.cancel(id, dto.reason, userId);
  }

  @Post(':id/events')
  @ApiOperation({ summary: 'Registrar evento manual en el viaje' })
  addEvent(@Param('id') id: string, @Body() dto: AddTripEventDto) {
    return this.tripsService.addEvent(id, dto);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Historial completo de eventos del viaje' })
  getEvents(@Param('id') id: string) {
    return this.tripsService.getEvents(id);
  }
}
