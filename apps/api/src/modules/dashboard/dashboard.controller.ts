import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'KPIs principales del dashboard' })
  getKPIs(@Query('companyId') companyId: string) {
    return this.dashboardService.getKPIs(companyId);
  }

  @Get('trips-by-status')
  @ApiOperation({ summary: 'Viajes agrupados por estado' })
  getTripsByStatus(@Query('companyId') companyId: string) {
    return this.dashboardService.getTripsByStatus(companyId);
  }

  @Get('monthly-trips')
  @ApiOperation({ summary: 'Viajes mensuales (últimos N meses)' })
  getMonthlyTrips(
    @Query('companyId') companyId: string,
    @Query('months') months?: number,
  ) {
    return this.dashboardService.getMonthlyTrips(companyId, months || 6);
  }

  @Get('expiring-documents')
  @ApiOperation({ summary: 'Documentos por vencer próximamente' })
  getExpiringDocuments(@Query('companyId') companyId: string) {
    return this.dashboardService.getExpiringDocuments(companyId);
  }
}
