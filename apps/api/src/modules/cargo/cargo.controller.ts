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
  create(@Body() dto: CreateCargoDto, @CurrentUser() user: any) {
    // Solo ADMIN puede crear cargas a nombre de otra empresa
    const companyId = user.role === Role.ADMIN && dto.companyId ? dto.companyId : user.companyId;
    return this.cargoService.create({ ...dto, companyId });
  }

  @Get()
  @ApiOperation({ summary: 'Listar cargas de la empresa' })
  findAll(
    @CurrentUser() user: any,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('radiusKm') radiusKm?: number,
    @Query('province') province?: string,
  ) {
    // No-ADMIN solo ve cargas de su propia empresa
    const effectiveCompanyId = user.role === Role.ADMIN ? companyId : user.companyId;
    return this.cargoService.findAll({ companyId: effectiveCompanyId, status, page, limit, lat, lng, radiusKm, province });
  }

  @Get('marketplace')
  @ApiOperation({ summary: 'Bolsa pública de cargas' })
  getMarketplace(@Query() filters: MarketplaceFilterDto) {
    return this.cargoService.getMarketplace(filters);
  }

  @Get('retorno')
  @ApiOperation({ summary: 'Bolsa de retorno: cargas cerca del destino del viaje' })
  getRetorno(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.cargoService.getRetorno(
      parseFloat(lat),
      parseFloat(lng),
      radiusKm ? parseFloat(radiusKm) : 150,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de carga con cotizaciones' })
  findOne(@Param('id') id: string) {
    return this.cargoService.getCargoWithQuotes(id);
  }

  @Patch(':id')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Editar carga (solo PENDIENTE)' })
  update(@Param('id') id: string, @Body() dto: UpdateCargoDto, @CurrentUser() user: any) {
    return this.cargoService.update(id, dto, user);
  }

  @Patch(':id/publish')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Publicar carga' })
  publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.cargoService.publish(id, user);
  }

  @Patch(':id/cancel')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Cancelar carga' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.cargoService.cancel(id, user);
  }

  @Delete(':id')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar carga (solo PENDIENTE)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.cargoService.remove(id, user);
  }

  @Patch(':id/select-quote/:quoteId')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Seleccionar cotización ganadora' })
  selectQuote(@Param('id') id: string, @Param('quoteId') quoteId: string, @CurrentUser() user: any) {
    return this.cargoService.selectQuote(id, quoteId, user);
  }
}
