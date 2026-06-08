import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsEnum } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;
}

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  @ApiOperation({ summary: 'Listar facturas' })
  findAll(
    @Query('companyId') companyId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.billingService.findAll(companyId, page, limit);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de facturación' })
  getSummary(@Query('companyId') companyId: string) {
    return this.billingService.getSummary(companyId);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Obtener factura' })
  findOne(@Param('id') id: string) {
    return this.billingService.findOne(id);
  }

  @Patch('invoices/:id/status')
  @ApiOperation({ summary: 'Actualizar estado de factura' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateInvoiceStatusDto) {
    return this.billingService.updateStatus(id, dto.status);
  }

  @Get('trips/:tripId/commission')
  @ApiOperation({ summary: 'Calcular comisión de un viaje' })
  calculateCommission(@Param('tripId') tripId: string) {
    return this.billingService.calculateTripCommission(tripId);
  }
}
