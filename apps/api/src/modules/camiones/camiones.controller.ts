import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CamionesService } from './camiones.service';
import { CreateTruckAvailabilityDto } from './dto/camiones.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Camiones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('camiones')
export class CamionesController {
  constructor(private readonly camionesService: CamionesService) {}

  @Post()
  @Roles(Role.TRANSPORTISTA, Role.ADMIN)
  @ApiOperation({ summary: 'Publicar disponibilidad de camión' })
  publish(@CurrentUser('companyId') companyId: string, @Body() dto: CreateTruckAvailabilityDto) {
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
  @Roles(Role.TRANSPORTISTA, Role.ADMIN)
  @ApiOperation({ summary: 'Mis publicaciones de disponibilidad' })
  getMyListings(@CurrentUser('companyId') companyId: string) {
    return this.camionesService.getMyListings(companyId);
  }

  @Patch(':id/deactivate')
  @Roles(Role.TRANSPORTISTA, Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar publicación' })
  deactivate(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.camionesService.deactivate(id, companyId);
  }
}
