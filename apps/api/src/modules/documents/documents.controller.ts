import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear documento' })
  create(@Body() dto: CreateDocumentDto) {
    return this.documentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos con filtros' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('driverId') driverId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.documentsService.findAll({ entityType, entityId, vehicleId, driverId, status, type, companyId });
  }

  @Get('check-expiries/:companyId')
  @ApiOperation({ summary: 'Preview expiries (GET)' })
  checkExpiriesGet(@Param('companyId') companyId: string) {
    return this.documentsService.checkExpiries(companyId);
  }

  @Post('check-expiries/:companyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalcular estados de vencimiento' })
  checkExpiries(@Param('companyId') companyId: string) {
    return this.documentsService.checkExpiries(companyId);
  }

  @Get('expiring/:companyId')
  @ApiOperation({ summary: 'Documentos próximos a vencer' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  getExpiring(
    @Param('companyId') companyId: string,
    @Query('daysAhead') daysAhead?: string,
  ) {
    return this.documentsService.getExpiringDocuments(companyId, daysAhead ? parseInt(daysAhead, 10) : 30);
  }

  @Post('generate-alerts/:companyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar alertas de vencimiento' })
  generateAlerts(@Param('companyId') companyId: string) {
    return this.documentsService.generateExpiryAlerts(companyId).then((count) => ({ alertsGenerated: count }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un documento' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar documento' })
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar documento' })
  remove(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
