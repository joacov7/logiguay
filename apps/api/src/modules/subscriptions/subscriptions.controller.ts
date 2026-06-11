import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsEnum, IsInt, Min, Max } from 'class-validator';
import { PlanType } from '@prisma/client';

class ActivateSubscriptionDto {
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

  @Get('current')
  @ApiOperation({ summary: 'Suscripción activa de la empresa' })
  getCurrent(@CurrentUser('companyId') companyId: string) {
    return this.subscriptionsService.getCurrent(companyId);
  }

  @Get('limits')
  @ApiOperation({ summary: 'Límites del plan actual' })
  getLimits(@CurrentUser('companyId') companyId: string) {
    return this.subscriptionsService.getPlanLimits(companyId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de suscripciones' })
  getHistory(@CurrentUser('companyId') companyId: string) {
    return this.subscriptionsService.getHistory(companyId);
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activar plan' })
  activate(@CurrentUser('companyId') companyId: string, @Body() dto: ActivateSubscriptionDto) {
    return this.subscriptionsService.activate(companyId, dto.plan, dto.months);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancelar suscripción' })
  cancel(@CurrentUser('companyId') companyId: string) {
    return this.subscriptionsService.cancel(companyId);
  }
}
