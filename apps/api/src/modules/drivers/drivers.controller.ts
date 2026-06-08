import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar chofer' })
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar choferes' })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.driversService.findAll(companyId, page, limit);
  }

  @Get('expiring-licenses')
  @ApiOperation({ summary: 'Choferes con licencias por vencer' })
  checkExpiring(@Query('days') days?: number) {
    return this.driversService.checkExpiringLicenses(days || 30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener chofer' })
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar chofer' })
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(id, dto);
  }
}
