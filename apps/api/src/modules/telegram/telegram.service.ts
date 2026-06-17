import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Telegraf, Markup } from 'telegraf';

// Pasos del flujo de carga
type Step = 'idle' | 'await_type' | 'await_weight' | 'await_origin' | 'await_destination' | 'await_date' | 'await_confirm';

interface ConversationState {
  step: Step;
  data: {
    type?: string;
    weightTons?: number;
    originAddress?: string;
    destinationAddress?: string;
    requiredDate?: string;
  };
}

const SESSION_TTL = 60 * 30; // 30 min

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  bot: Telegraf;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.bot = new Telegraf(token);
    if (token) this.setupHandlers();
  }

  // ── Sesión conversacional en Redis ────────────────────────────────────────

  private sessionKey(chatId: number) {
    return `tg:session:${chatId}`;
  }

  private async getSession(chatId: number): Promise<ConversationState> {
    const s = await this.redis.getJson<ConversationState>(this.sessionKey(chatId));
    return s ?? { step: 'idle', data: {} };
  }

  private async setSession(chatId: number, state: ConversationState) {
    await this.redis.setJson(this.sessionKey(chatId), state, SESSION_TTL);
  }

  private async clearSession(chatId: number) {
    await this.redis.del(this.sessionKey(chatId));
  }

  // ── Vinculación de cuenta ─────────────────────────────────────────────────

  async linkAccount(telegramId: string, userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { telegramId },
    });
  }

  async getUserByTelegramId(telegramId: string) {
    return this.prisma.user.findFirst({
      where: { telegramId },
      include: {
        companyUsers: {
          select: { companyId: true },
          take: 1,
        },
      },
    });
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private setupHandlers() {
    const bot = this.bot;

    bot.command('start', async (ctx) => {
      const telegramId = String(ctx.from.id);

      // Vinculación: /start link_<base64url(userId)>
      const param = (ctx.message as any).text?.split(' ')[1] ?? '';
      if (param.startsWith('link_')) {
        const code = param.slice(5);
        try {
          const userId = Buffer.from(code, 'base64url').toString();
          await this.prisma.user.update({
            where: { id: userId },
            data: { telegramId },
          });
          await ctx.reply('✅ *¡Cuenta vinculada!* Ya podés publicar cargas escribiendo *carga*.', {
            parse_mode: 'Markdown',
          });
        } catch {
          await ctx.reply('❌ El enlace de vinculación no es válido o expiró. Generá uno nuevo desde la web.');
        }
        return;
      }

      const user = await this.getUserByTelegramId(telegramId);

      if (!user) {
        await ctx.reply(
          '👋 Hola. Para usar este bot necesitás vincular tu cuenta de LOGIGUAY.\n\n' +
          'Entrá a la web, andá a *Mi Perfil → Vincular Telegram* y seguí las instrucciones.',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      await ctx.reply(
        `👋 Hola *${user.firstName}*. Soy el bot de LOGIGUAY.\n\n` +
        'Escribí *carga* para publicar una nueva carga.',
        { parse_mode: 'Markdown' },
      );
    });

    // Comando principal
    bot.hears(/^carga$/i, async (ctx) => {
      const telegramId = String(ctx.from.id);
      const user = await this.getUserByTelegramId(telegramId);

      if (!user || user.role !== 'DADOR') {
        await ctx.reply('⚠️ Solo los dadores de carga pueden publicar cargas.');
        return;
      }

      await this.setSession(ctx.chat.id, { step: 'await_type', data: {} });
      await ctx.reply(
        '📦 *Nueva carga*\n\n¿Qué tipo de mercadería es?\n\n_Ej: Soja, Maíz, Cemento, Maquinaria_',
        { parse_mode: 'Markdown' },
      );
    });

    // Flujo conversacional — mensajes de texto
    bot.on('text', async (ctx) => {
      const telegramId = String(ctx.from.id);
      const user = await this.getUserByTelegramId(telegramId);
      if (!user) return;

      const chatId = ctx.chat.id;
      const text = ctx.message.text.trim();
      const session = await this.getSession(chatId);

      switch (session.step) {
        case 'await_type': {
          await this.setSession(chatId, { step: 'await_weight', data: { type: text } });
          await ctx.reply('⚖️ ¿Cuántas *toneladas*?\n\n_Ej: 28_', { parse_mode: 'Markdown' });
          break;
        }

        case 'await_weight': {
          const weight = parseFloat(text.replace(',', '.'));
          if (isNaN(weight) || weight <= 0) {
            await ctx.reply('❌ Ingresá un número válido. ¿Cuántas toneladas?');
            break;
          }
          await this.setSession(chatId, {
            step: 'await_origin',
            data: { ...session.data, weightTons: weight },
          });
          await ctx.reply('📍 ¿Desde dónde sale la carga? (ciudad o dirección)', { parse_mode: 'Markdown' });
          break;
        }

        case 'await_origin': {
          await this.setSession(chatId, {
            step: 'await_destination',
            data: { ...session.data, originAddress: text },
          });
          await ctx.reply('🏁 ¿A dónde va la carga? (ciudad o dirección)', { parse_mode: 'Markdown' });
          break;
        }

        case 'await_destination': {
          await this.setSession(chatId, {
            step: 'await_date',
            data: { ...session.data, destinationAddress: text },
          });
          await ctx.reply(
            '📅 ¿Para qué fecha?\n\n_Ingresá en formato dd/mm o dd/mm/aaaa_',
            { parse_mode: 'Markdown' },
          );
          break;
        }

        case 'await_date': {
          const date = this.parseDate(text);
          if (!date) {
            await ctx.reply('❌ Formato de fecha inválido. Usá dd/mm o dd/mm/aaaa. Ejemplo: 25/06');
            break;
          }
          const d = { ...session.data, requiredDate: date };
          await this.setSession(chatId, { step: 'await_confirm', data: d });
          await ctx.reply(
            `✅ *Revisá la carga antes de publicar:*\n\n` +
            `📦 *Tipo:* ${d.type}\n` +
            `⚖️ *Peso:* ${d.weightTons} toneladas\n` +
            `📍 *Origen:* ${d.originAddress}\n` +
            `🏁 *Destino:* ${d.destinationAddress}\n` +
            `📅 *Fecha:* ${new Date(date).toLocaleDateString('es-AR')}`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('✅ Publicar', 'confirm_cargo'),
                  Markup.button.callback('❌ Cancelar', 'cancel_cargo'),
                ],
              ]),
            },
          );
          break;
        }

        case 'idle':
        default: {
          if (!/^carga$/i.test(text)) {
            await ctx.reply('Escribí *carga* para publicar una nueva carga.', { parse_mode: 'Markdown' });
          }
          break;
        }
      }
    });

    // Confirmación via inline button
    bot.action('confirm_cargo', async (ctx) => {
      await ctx.answerCbQuery();
      const telegramId = String(ctx.from.id);
      const user = await this.getUserByTelegramId(telegramId);
      if (!user) return;

      const chatId = ctx.chat!.id;
      const session = await this.getSession(chatId);
      if (session.step !== 'await_confirm') return;

      const companyId = user.companyUsers[0]?.companyId;
      if (!companyId) {
        await ctx.editMessageText('⚠️ No tenés una empresa registrada. Creala en la web antes de publicar cargas.');
        await this.clearSession(chatId);
        return;
      }

      try {
        const d = session.data;
        await this.prisma.cargo.create({
          data: {
            companyId,
            type: d.type!,
            weightTons: d.weightTons!,
            originAddress: d.originAddress!,
            destinationAddress: d.destinationAddress!,
            requiredDate: d.requiredDate ? new Date(d.requiredDate) : null,
            status: 'PUBLICADO',
          },
        });

        await ctx.editMessageText(
          '🎉 *¡Carga publicada!* Ya está visible en la bolsa.\n' +
          'Los transportistas pueden empezar a cotizar.',
          { parse_mode: 'Markdown' },
        );
      } catch (e: any) {
        this.logger.error('Error creating cargo from Telegram', e);
        await ctx.editMessageText('❌ Hubo un error al publicar la carga. Intentá de nuevo.');
      }

      await this.clearSession(chatId);
    });

    // Cancelación
    bot.action('cancel_cargo', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.editMessageText('❌ Carga cancelada. Escribí *carga* cuando quieras intentar de nuevo.', {
        parse_mode: 'Markdown',
      });
      await this.clearSession(ctx.chat!.id);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private parseDate(text: string): string | null {
    const now = new Date();
    const year = now.getFullYear();

    // dd/mm o dd/mm/aaaa
    const m = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (!m) return null;

    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const y = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : year;

    const date = new Date(y, month, day);
    if (isNaN(date.getTime()) || day < 1 || day > 31 || month < 0 || month > 11) return null;

    return date.toISOString();
  }

  // Enviar mensaje directo a un usuario por su telegramId
  async notify(telegramId: string, message: string) {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    } catch (e) {
      this.logger.warn(`No se pudo notificar a telegramId ${telegramId}`, e);
    }
  }
}
