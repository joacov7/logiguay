import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/quote.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles(Role.TRANSPORTISTA, Role.ADMIN)
  @ApiOperation({ summary: 'Presentar cotización' })
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateQuoteDto) {
    // transportCompanyId siempre sale del JWT, nunca del body
    return this.quotesService.create({ ...dto, transportCompanyId: companyId });
  }

  @Get('cargo/:cargoId')
  @ApiOperation({ summary: 'Cotizaciones de una carga (solo dueño de la carga)' })
  findByCargoId(
    @Param('cargoId') cargoId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('role') role: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.quotesService.findByCargoId(cargoId, companyId, role, page, limit);
  }

  @Patch(':id/accept')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Aceptar cotización (asigna la carga y crea el viaje)' })
  accept(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.quotesService.accept(id, companyId);
  }

  @Patch(':id/reject')
  @Roles(Role.DADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Rechazar cotización' })
  reject(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.quotesService.reject(id, companyId);
  }

  @Get('my')
  @Roles(Role.TRANSPORTISTA, Role.ADMIN)
  @ApiOperation({ summary: 'Mis cotizaciones' })
  findMyQuotes(
    @CurrentUser('companyId') companyId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.quotesService.findByCompany(companyId, page, limit);
  }

  @Patch(':id/withdraw')
  @Roles(Role.TRANSPORTISTA, Role.ADMIN)
  @ApiOperation({ summary: 'Retirar cotización propia' })
  withdraw(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.quotesService.withdraw(id, companyId);
  }
}
