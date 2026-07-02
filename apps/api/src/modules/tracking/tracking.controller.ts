import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Última posición de un vehículo' })
  getVehiclePosition(@Param('vehicleId') vehicleId: string) {
    return this.trackingService.getVehiclePosition(vehicleId);
  }

  @Get('fleet')
  @ApiOperation({ summary: 'Posición de toda la flota de la empresa autenticada' })
  async getFleetPositions(@CurrentUser() user: any) {
    // Usa todas las empresas del usuario, no solo la del JWT
    const memberships = await this.prisma.companyUser.findMany({
      where: { userId: user.id },
      select: { companyId: true },
    });
    const companyIds = memberships.map((m) => m.companyId);
    return this.trackingService.getFleetPositionsMulti(companyIds);
  }

  @Get('vehicle/:vehicleId/history')
  @ApiOperation({ summary: 'Historial de posiciones de un vehículo' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  getVehicleHistory(
    @Param('vehicleId') vehicleId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.trackingService.getVehicleHistory(
      vehicleId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
