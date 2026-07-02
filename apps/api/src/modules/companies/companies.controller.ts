import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear empresa' })
  create(@Body() dto: CreateCompanyDto, @CurrentUser('id') userId: string) {
    return this.companiesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar empresas' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.companiesService.findAll(page, limit);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Mis empresas' })
  getUserCompanies(@CurrentUser('id') userId: string) {
    return this.companiesService.getUserCompanies(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener empresa por ID' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar empresa' })
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }
}
