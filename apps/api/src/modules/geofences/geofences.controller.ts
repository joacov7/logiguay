import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GeofencesService } from './geofences.service';
import { CreateGeoFenceDto } from './dto/geofence.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Geofences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('geofences')
export class GeofencesController {
  constructor(private readonly geofencesService: GeofencesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear geocerca' })
  create(@Body() dto: CreateGeoFenceDto) {
    return this.geofencesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar geocercas' })
  findAll(@Query('companyId') companyId?: string) {
    return this.geofencesService.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener geocerca' })
  findOne(@Param('id') id: string) {
    return this.geofencesService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar geocerca' })
  delete(@Param('id') id: string) {
    return this.geofencesService.delete(id);
  }
}
