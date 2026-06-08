import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CargoService } from './cargo.service';
import { CreateCargoDto, UpdateCargoDto } from './dto/cargo.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Cargo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cargo')
export class CargoController {
  constructor(private readonly cargoService: CargoService) {}

  @Post()
  @ApiOperation({ summary: 'Crear carga' })
  create(@Body() dto: CreateCargoDto) {
    return this.cargoService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cargas' })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.cargoService.findAll({ companyId, status, page, limit });
  }

  @Get('marketplace')
  @ApiOperation({ summary: 'Bolsa de cargas publicadas' })
  getMarketplace(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.cargoService.getMarketplace(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener carga' })
  findOne(@Param('id') id: string) {
    return this.cargoService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar carga' })
  update(@Param('id') id: string, @Body() dto: UpdateCargoDto) {
    return this.cargoService.update(id, dto);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publicar carga' })
  publish(@Param('id') id: string) {
    return this.cargoService.publish(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar carga' })
  cancel(@Param('id') id: string) {
    return this.cargoService.cancel(id);
  }
}
