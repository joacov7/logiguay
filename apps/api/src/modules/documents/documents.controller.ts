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
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear documento' })
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateDocumentDto) {
    return this.documentsService.create({ ...dto, companyId });
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos con filtros' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('driverId') driverId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.documentsService.findAll({ entityType, entityId, vehicleId, driverId, status, type, companyId });
  }

  @Get('check-expiries')
  @ApiOperation({ summary: 'Preview expiries (GET)' })
  checkExpiriesGet(@CurrentUser('companyId') companyId: string) {
    return this.documentsService.checkExpiries(companyId);
  }

  @Post('check-expiries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalcular estados de vencimiento' })
  checkExpiries(@CurrentUser('companyId') companyId: string) {
    return this.documentsService.checkExpiries(companyId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Documentos próximos a vencer' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  getExpiring(
    @CurrentUser('companyId') companyId: string,
    @Query('daysAhead') daysAhead?: string,
  ) {
    return this.documentsService.getExpiringDocuments(companyId, daysAhead ? parseInt(daysAhead, 10) : 30);
  }

  @Post('generate-alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar alertas de vencimiento' })
  generateAlerts(@CurrentUser('companyId') companyId: string) {
    return this.documentsService.generateExpiryAlerts(companyId).then((count) => ({ alertsGenerated: count }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un documento' })
  findOne(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.documentsService.findOne(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar documento' })
  update(@Param('id') id: string, @CurrentUser('companyId') companyId: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto, companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar documento' })
  remove(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.documentsService.delete(id, companyId);
  }
}
