import { Controller, Post, Body, Headers, Get, Query, UnauthorizedException, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Telegram')
@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly config: ConfigService,
  ) {}

  // Webhook que Telegram llama en cada mensaje
  @Post('webhook')
  @ApiOperation({ summary: 'Webhook de Telegram (uso interno)' })
  async webhook(
    @Body() body: any,
    @Headers('x-telegram-bot-api-secret-token') secret: string,
  ) {
    const expected = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET', '');
    if (expected && secret !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
    await this.telegramService.bot.handleUpdate(body);
    return { ok: true };
  }

  // El usuario vincula su cuenta: llama a este endpoint desde la web
  @Get('link')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener enlace de vinculación con Telegram' })
  getLinkInfo(@CurrentUser() user: any) {
    const botUsername = this.config.get<string>('TELEGRAM_BOT_USERNAME', '');
    const code = Buffer.from(user.id).toString('base64url');
    return {
      url: `https://t.me/${botUsername}?start=link_${code}`,
      botUsername,
      linked: !!user.telegramId,
    };
  }
}
