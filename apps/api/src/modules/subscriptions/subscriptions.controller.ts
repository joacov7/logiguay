import { Controller, Get, Post, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsEnum, IsString } from 'class-validator';
import { PlanType } from '@prisma/client';

class SubscribeDto {
  @IsString()
  companyId: string;

  @IsEnum(PlanType)
  plan: PlanType;
}

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Planes disponibles y precios' })
  getPlanPrices() {
    return this.subscriptionsService.getPlanPrices();
  }

  @Get('active')
  @ApiOperation({ summary: 'Plan activo de la empresa' })
  getActivePlan(@Query('companyId') companyId: string) {
    return this.subscriptionsService.getActivePlan(companyId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de suscripciones' })
  getHistory(@Query('companyId') companyId: string) {
    return this.subscriptionsService.getHistory(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Suscribirse a un plan' })
  subscribe(@Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(dto.companyId, dto.plan);
  }

  @Delete()
  @ApiOperation({ summary: 'Cancelar suscripción' })
  cancel(@Query('companyId') companyId: string) {
    return this.subscriptionsService.cancel(companyId);
  }
}
