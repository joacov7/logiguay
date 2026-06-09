import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { PlanType } from '@prisma/client';

class ActivateSubscriptionDto {
  @IsString()
  companyId: string;

  @IsEnum(PlanType)
  plan: PlanType;

  @IsInt()
  @Min(1)
  @Max(12)
  months: number;
}

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('current/:companyId')
  @ApiOperation({ summary: 'Suscripción activa de la empresa' })
  getCurrent(@Param('companyId') companyId: string) {
    return this.subscriptionsService.getCurrent(companyId);
  }

  @Get('limits/:companyId')
  @ApiOperation({ summary: 'Límites del plan actual' })
  getLimits(@Param('companyId') companyId: string) {
    return this.subscriptionsService.getPlanLimits(companyId);
  }

  @Get('history/:companyId')
  @ApiOperation({ summary: 'Historial de suscripciones' })
  getHistory(@Param('companyId') companyId: string) {
    return this.subscriptionsService.getHistory(companyId);
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activar plan' })
  activate(@Body() dto: ActivateSubscriptionDto) {
    return this.subscriptionsService.activate(dto.companyId, dto.plan, dto.months);
  }

  @Post('cancel/:companyId')
  @ApiOperation({ summary: 'Cancelar suscripción' })
  cancel(@Param('companyId') companyId: string) {
    return this.subscriptionsService.cancel(companyId);
  }
}
