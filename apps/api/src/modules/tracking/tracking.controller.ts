import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';

@ApiTags('Tracking')
@ApiBearerAuth()
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Última posición de un vehículo' })
  getVehiclePosition(@Param('vehicleId') vehicleId: string) {
    return this.trackingService.getVehiclePosition(vehicleId);
  }

  @Get('company/:companyId/fleet')
  @ApiOperation({ summary: 'Posición de toda la flota de una empresa' })
  getFleetPositions(@Param('companyId') companyId: string) {
    return this.trackingService.getFleetPositions(companyId);
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
