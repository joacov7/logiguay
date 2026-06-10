import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CamionesService } from './camiones.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Camiones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('camiones')
export class CamionesController {
  constructor(private readonly camionesService: CamionesService) {}

  @Post()
  @ApiOperation({ summary: 'Publicar disponibilidad de camión' })
  publish(@CurrentUser('companyId') companyId: string, @Body() dto: any) {
    return this.camionesService.publish(companyId, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar camiones disponibles (DADOR)' })
  search(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('vehicleType') vehicleType?: string,
  ) {
    return this.camionesService.search(
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
      radiusKm ? parseFloat(radiusKm) : 200,
      vehicleType,
    );
  }

  @Get('my-listings')
  @ApiOperation({ summary: 'Mis publicaciones de disponibilidad' })
  getMyListings(@CurrentUser('companyId') companyId: string) {
    return this.camionesService.getMyListings(companyId);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar publicación' })
  deactivate(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.camionesService.deactivate(id, companyId);
  }
}
