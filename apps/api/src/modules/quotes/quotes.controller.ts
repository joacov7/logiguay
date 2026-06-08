import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, UpdateQuoteStatusDto } from './dto/quote.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear cotización' })
  create(@Body() dto: CreateQuoteDto) {
    return this.quotesService.create(dto);
  }

  @Get('cargo/:cargoId')
  @ApiOperation({ summary: 'Cotizaciones de una carga' })
  findByCargo(@Param('cargoId') cargoId: string) {
    return this.quotesService.findByCargo(cargoId);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Cotizaciones de una empresa' })
  findByCompany(
    @Param('companyId') companyId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.quotesService.findByCompany(companyId, page, limit);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Aceptar o rechazar cotización' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateQuoteStatusDto) {
    return this.quotesService.updateStatus(id, dto);
  }
}
