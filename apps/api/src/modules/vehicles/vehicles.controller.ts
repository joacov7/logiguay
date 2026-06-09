import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto, UpdateVehicleStatusDto } from './dto/vehicle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VehicleType, VehicleStatus } from '@prisma/client';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de flota' })
  getStats(@Query('companyId') companyId: string) {
    return this.vehiclesService.getStats(companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar vehículos' })
  findAll(
    @Query('companyId') companyId: string,
    @Query('type') type?: VehicleType,
    @Query('status') status?: VehicleStatus,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.vehiclesService.findAll({ companyId, type, status, search, page, limit });
  }

  @Post()
  @ApiOperation({ summary: 'Registrar vehículo' })
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto.companyId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener vehículo' })
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar vehículo' })
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado del vehículo' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateVehicleStatusDto) {
    return this.vehiclesService.updateStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar vehículo' })
  delete(@Param('id') id: string) {
    return this.vehiclesService.delete(id);
  }
}
