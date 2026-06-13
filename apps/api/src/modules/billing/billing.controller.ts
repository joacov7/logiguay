import { Controller, Get, Patch, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InvoiceType, InvoiceStatus } from '@prisma/client';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  @ApiOperation({ summary: 'Listar facturas con filtros' })
  @ApiQuery({ name: 'type', enum: InvoiceType, required: false })
  @ApiQuery({ name: 'status', enum: InvoiceStatus, required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getInvoices(
    @CurrentUser('companyId') companyId: string,
    @Query('type') type?: InvoiceType,
    @Query('status') status?: InvoiceStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.billingService.getInvoices(companyId, { type, status, page, limit });
  }

  @Get('invoices/summary')
  @ApiOperation({ summary: 'Resumen financiero' })
  getSummary(@CurrentUser('companyId') companyId: string) {
    return this.billingService.getSummary(companyId);
  }

  @Get('invoice/:id')
  @ApiOperation({ summary: 'Detalle de factura' })
  getInvoice(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.billingService.getInvoice(id, companyId);
  }

  @Patch('invoice/:id/pay')
  @ApiOperation({ summary: 'Marcar factura como pagada' })
  markAsPaid(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.billingService.markAsPaid(id, companyId);
  }

  @Patch('invoice/:id/cancel')
  @ApiOperation({ summary: 'Cancelar factura' })
  cancelInvoice(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.billingService.cancel(id, companyId);
  }

  @Get('finanzas/resumen')
  @ApiOperation({ summary: 'Resumen financiero orientativo para transportistas' })
  getFinanzasResumen(@CurrentUser('companyId') companyId: string) {
    return this.billingService.getFinanzasResumen(companyId);
  }

  // ── Admin endpoints ───────────────────────────────────────────────────────────

  @Get('admin/resumen')
  @ApiOperation({ summary: '[ADMIN] Resumen de ingresos de la plataforma' })
  getAdminRevenueSummary(@CurrentUser('role') role: string) {
    if (role !== 'ADMIN') throw new ForbiddenException();
    return this.billingService.getAdminRevenueSummary();
  }

  @Get('admin/comisiones')
  @ApiOperation({ summary: '[ADMIN] Listado de comisiones' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', enum: InvoiceStatus, required: false })
  getAdminComisiones(
    @CurrentUser('role') role: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: InvoiceStatus,
  ) {
    if (role !== 'ADMIN') throw new ForbiddenException();
    return this.billingService.getAdminComisiones(page, limit, status);
  }

  @Patch('admin/invoice/:id/pay')
  @ApiOperation({ summary: '[ADMIN] Marcar comisión como pagada' })
  adminMarkPaid(@Param('id') id: string, @CurrentUser('role') role: string) {
    if (role !== 'ADMIN') throw new ForbiddenException();
    return this.billingService.adminMarkPaid(id);
  }
}
