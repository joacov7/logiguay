import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MarketService } from './market.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Market')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('granos')
  @ApiOperation({ summary: 'Cotización de granos (proxy cacheado de argentinadatos.com)' })
  getGrainPrices() {
    return this.marketService.getGrainPrices();
  }
}
