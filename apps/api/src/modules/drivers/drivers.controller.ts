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
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de choferes' })
  getStats(@Query('companyId') companyId: string) {
    return this.driversService.getStats(companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar choferes' })
  findAll(
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.driversService.findAll({ companyId, status, search, page, limit });
  }

  @Post()
  @ApiOperation({ summary: 'Registrar chofer' })
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto.companyId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener chofer' })
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar chofer' })
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar chofer' })
  delete(@Param('id') id: string) {
    return this.driversService.delete(id);
  }
}
