import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GeofencesService } from './geofences.service';
import { CreateGeoFenceDto } from './dto/geofence.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Geofences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('geofences')
export class GeofencesController {
  constructor(private readonly geofencesService: GeofencesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear geocerca' })
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateGeoFenceDto) {
    return this.geofencesService.create({ ...dto, companyId });
  }

  @Get()
  @ApiOperation({ summary: 'Listar geocercas' })
  findAll(@CurrentUser('companyId') companyId: string) {
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
