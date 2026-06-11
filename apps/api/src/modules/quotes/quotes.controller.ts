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
  @ApiOperation({ summary: 'Cotizaciones de una carga' })
  findByCargoId(
    @Param('cargoId') cargoId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.quotesService.findByCargoId(cargoId, page, limit);
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
