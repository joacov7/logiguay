import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'KPIs principales del dashboard ejecutivo' })
  getStats(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.dashboardService.getStats(companyId, role);
  }

  @Get('time-series')
  @ApiOperation({ summary: 'Serie temporal de viajes y facturación' })
  getTimeSeries(
    @CurrentUser('companyId') companyId: string,
    @Query('months') months?: string,
  ) {
    return this.dashboardService.getTripTimeSeries(companyId, months ? parseInt(months, 10) : 6);
  }
}
