import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ForbiddenException, IsString } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { AdminUpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() user: any,
  ) {
    if (user.role !== Role.ADMIN && user.id !== id) {
      throw new ForbiddenException('No autorizado');
    }
    // role e isActive solo los puede modificar un ADMIN
    if (user.role !== Role.ADMIN) {
      delete dto.role;
      delete dto.isActive;
    }
    return this.usersService.update(id, dto);
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Registrar token de notificaciones push' })
  savePushToken(@CurrentUser('sub') userId: string, @Body('token') token: string) {
    return this.usersService.savePushToken(userId, token);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar usuario' })
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
