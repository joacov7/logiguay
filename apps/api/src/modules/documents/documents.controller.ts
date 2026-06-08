import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Cargar documento' })
  create(@Body() dto: CreateDocumentDto) {
    return this.documentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.documentsService.findAll(page, limit);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Documentos por vencer' })
  getExpiring(@Query('days') days?: number) {
    return this.documentsService.getExpiring(days || 30);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Documentos de una entidad' })
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.documentsService.findByEntity(entityType, entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener documento' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar documento' })
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @Post('sync-expiry')
  @ApiOperation({ summary: 'Sincronizar estados de expiración' })
  syncExpiry() {
    return this.documentsService.syncExpiryStatuses();
  }
}
