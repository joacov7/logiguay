import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/roles.decorator';
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

  @Get('usage')
  @ApiOperation({ summary: 'Uso actual vs límites del plan' })
  async getUsage(@CurrentUser('companyId') companyId: string) {
    return this.subscriptionsService.getUsage(companyId);
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

  @Post('create-preference')
  @ApiOperation({ summary: 'Crear preferencia de pago MercadoPago' })
  createPreference(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: ActivateSubscriptionDto,
  ) {
    return this.subscriptionsService.createPreference(companyId, dto.plan, dto.months);
  }

  @Post('webhook/mp')
  @Public()
  @ApiOperation({ summary: 'Webhook MercadoPago (sin auth)' })
  mpWebhook(@Query('id') paymentId: string, @Body() body: any) {
    const id = paymentId ?? body?.data?.id;
    if (!id) return { ignored: true };
    return this.subscriptionsService.handleMpWebhook(String(id));
  }
}
