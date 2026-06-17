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
  @ApiQuery({ name: 'status', required: false, enum: TripStatus })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    let scope: 'transport' | 'cargo' | undefined;
    let driverId: string | undefined;

    if (user.role === 'TRANSPORTISTA') {
      scope = 'transport';
    } else if (user.role === 'DADOR') {
      scope = 'cargo';
    } else if (user.role === 'CHOFER') {
      driverId = user.driverId;
    }
    // ADMIN can see everything without forced filters

    return this.tripsService.findAll({
      userId: scope ? user.id : undefined,
      scope,
      status,
      driverId,
      vehicleId,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un viaje' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tripsService.findOne(id, user);
  }

  @Get(':id/eta')
  @ApiOperation({ summary: 'ETA actual del viaje' })
  getEta(@Param('id') id: string) {
    return this.tripsService.getEta(id);
  }

  @Patch(':id/assign')
  @Roles('TRANSPORTISTA', 'ADMIN')
  @ApiOperation({ summary: 'Asignar vehículo y chofer al viaje' })
  assign(@Param('id') id: string, @Body() dto: AssignTripDto, @CurrentUser() user: any) {
    return this.tripsService.assign(id, dto, user);
  }

  @Patch(':id/status')
  @Roles('TRANSPORTISTA', 'CHOFER', 'ADMIN')
  @ApiOperation({ summary: 'Avanzar estado del viaje' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTripStatusDto, @CurrentUser() user: any) {
    return this.tripsService.updateStatus(id, dto, user);
  }

  @Patch(':id/cancel')
  @Roles('TRANSPORTISTA', 'CHOFER', 'ADMIN')
  @ApiOperation({ summary: 'Cancelar viaje' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelTripDto,
    @CurrentUser() user: any,
  ) {
    return this.tripsService.cancel(id, dto.reason, user.id, user);
  }

  @Post(':id/events')
  @Roles('TRANSPORTISTA', 'CHOFER', 'ADMIN')
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
