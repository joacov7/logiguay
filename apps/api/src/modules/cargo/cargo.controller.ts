import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CargoService } from './cargo.service';
import { CreateCargoDto, UpdateCargoDto, MarketplaceFilterDto } from './dto/cargo.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Cargo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cargo')
export class CargoController {
  constructor(private readonly cargoService: CargoService) {}

  @Post()
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Crear carga' })
  create(@Body() dto: CreateCargoDto, @CurrentUser('companyId') companyId: string) {
    return this.cargoService.create({ ...dto, companyId: dto.companyId || companyId });
  }

  @Get()
  @ApiOperation({ summary: 'Listar cargas de la empresa' })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.cargoService.findAll({ companyId, status, page, limit });
  }

  @Get('marketplace')
  @ApiOperation({ summary: 'Bolsa pública de cargas' })
  getMarketplace(@Query() filters: MarketplaceFilterDto) {
    return this.cargoService.getMarketplace(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de carga con cotizaciones' })
  findOne(@Param('id') id: string) {
    return this.cargoService.getCargoWithQuotes(id);
  }

  @Patch(':id')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Editar carga (solo PENDIENTE)' })
  update(@Param('id') id: string, @Body() dto: UpdateCargoDto) {
    return this.cargoService.update(id, dto);
  }

  @Patch(':id/publish')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Publicar carga' })
  publish(@Param('id') id: string) {
    return this.cargoService.publish(id);
  }

  @Patch(':id/cancel')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Cancelar carga' })
  cancel(@Param('id') id: string) {
    return this.cargoService.cancel(id);
  }

  @Delete(':id')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar carga (solo PENDIENTE)' })
  remove(@Param('id') id: string) {
    return this.cargoService.remove(id);
  }

  @Patch(':id/select-quote/:quoteId')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Seleccionar cotización ganadora' })
  selectQuote(@Param('id') id: string, @Param('quoteId') quoteId: string) {
    return this.cargoService.selectQuote(id, quoteId);
  }
}
