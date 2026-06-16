import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas generales de la plataforma' })
  getStats() {
    return this.adminService.getStats();
  }

  // ── Companies ──────────────────────────────────────────────────────────────

  @Get('companies')
  @ApiOperation({ summary: 'Listar todas las empresas' })
  getCompanies(@Query('search') search?: string, @Query('type') type?: string) {
    return this.adminService.getCompanies({ search, type });
  }

  @Patch('companies/:id')
  @ApiOperation({ summary: 'Actualizar empresa' })
  updateCompany(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateCompany(id, body);
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  @Get('subscriptions')
  @ApiOperation({ summary: 'Listar todas las suscripciones' })
  getSubscriptions(@Query('status') status?: string) {
    return this.adminService.getSubscriptions({ status });
  }

  @Patch('subscriptions/:id')
  @ApiOperation({ summary: 'Actualizar suscripción (renovar, cambiar plan, cancelar)' })
  updateSubscription(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateSubscription(id, body);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  getUsers(@Query('search') search?: string, @Query('role') role?: string) {
    return this.adminService.getUsers({ search, role });
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Actualizar usuario (rol, estado activo)' })
  updateUser(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateUser(id, body);
  }

  @Patch('users/:id/reset-password')
  @ApiOperation({ summary: 'Resetear contraseña de un usuario' })
  resetUserPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return this.adminService.resetUserPassword(id, body?.password);
  }
}
