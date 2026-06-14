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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VehicleType, VehicleStatus } from '@prisma/client';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de flota' })
  getStats(@CurrentUser('companyId') companyId: string) {
    return this.vehiclesService.getStats(companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar vehículos' })
  findAll(
    @CurrentUser('companyId') companyId: string,
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
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(companyId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener vehículo' })
  findOne(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.vehiclesService.findOne(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar vehículo' })
  update(@Param('id') id: string, @CurrentUser('companyId') companyId: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto, companyId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado del vehículo' })
  updateStatus(@Param('id') id: string, @CurrentUser('companyId') companyId: string, @Body() dto: UpdateVehicleStatusDto) {
    return this.vehiclesService.updateStatus(id, dto, companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar vehículo' })
  delete(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.vehiclesService.delete(id, companyId);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: '[Admin] Listar todos los vehículos' })
  adminFindAll() {
    return this.vehiclesService.adminFindAll();
  }

  @Patch('admin/:id/imei')
  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: '[Admin] Asignar IMEI GPS a vehículo' })
  adminUpdateImei(@Param('id') id: string, @Body('trackerDeviceId') trackerDeviceId: string | null) {
    return this.vehiclesService.adminUpdateImei(id, trackerDeviceId);
  }
}
