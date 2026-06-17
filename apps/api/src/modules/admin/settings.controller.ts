import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener settings públicos de la plataforma (sin auth)' })
  getSettings() {
    return this.adminService.getSettings();
  }
}
