import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

export interface GrainEntry {
  nombre: string;
  unidad: string;
  precio: number;
  variacion: number;
}

const CACHE_KEY = 'market:granos';
// La pizarra se publica una vez por día hábil — cachear 6 h es suficiente
const CACHE_TTL_SECONDS = 6 * 60 * 60;

// Pizarra de la Cámara Arbitral de Cereales de Rosario (BCR)
const PIZARRA_URL = 'https://www.cac.bcr.com.ar/es/precios-de-pizarra';

const GRAINS = [
  { key: 'soja', nombre: 'Soja' },
  { key: 'maiz', nombre: 'Maíz' },
  { key: 'trigo', nombre: 'Trigo' },
  { key: 'girasol', nombre: 'Girasol' },
  { key: 'sorgo', nombre: 'Sorgo' },
];

/** Quita tildes y pasa a minúsculas para comparar nombres */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Convierte "350.500,00" o "350500" a número */
function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(private readonly redis: RedisService) {}

  async getGrainPrices(): Promise<GrainEntry[]> {
    const cached = await this.redis.getJson<GrainEntry[]>(CACHE_KEY);
    if (cached) return cached;

    try {
      const res = await fetch(PIZARRA_URL, {
        headers: {
          Accept: 'text/html',
          'User-Agent': 'Mozilla/5.0 (compatible; LogiguayBot/1.0)',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`upstream status ${res.status}`);

      const html = await res.text();
      const entries = this.parsePizarra(html);
      if (entries.length === 0) throw new Error('no se pudo extraer ningún precio del HTML');

      await this.redis.setJson(CACHE_KEY, entries, CACHE_TTL_SECONDS);
      // Copia sin TTL para servir como fallback si la página cae o cambia
      await this.redis.setJson(`${CACHE_KEY}:stale`, entries);
      return entries;
    } catch (err) {
      this.logger.warn(`No se pudo obtener cotización de granos: ${(err as Error).message}`);
      const stale = await this.redis.getJson<GrainEntry[]>(`${CACHE_KEY}:stale`);
      if (stale) return stale;
      throw new ServiceUnavailableException('Cotización de granos no disponible');
    }
  }

  /**
   * Extrae precios del HTML de la pizarra. La página lista cada grano con su
   * precio en $/tonelada. El parseo es tolerante al markup: busca el nombre del
   * grano y toma el primer número con formato de precio que aparezca después.
   */
  private parsePizarra(html: string): GrainEntry[] {
    // Sacar scripts/estilos y tags, conservando separadores
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ');

    const normText = normalize(text);
    const entries: GrainEntry[] = [];

    for (const grain of GRAINS) {
      const idx = normText.indexOf(grain.key);
      if (idx === -1) continue;

      // Buscar el primer precio (formato 123.456,00 / 123456,00 / 123456) en los
      // 200 caracteres posteriores al nombre del grano
      const window = text.slice(idx, idx + 200);
      const match = window.match(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{4,}(?:,\d+)?)/);
      if (!match) continue;

      const precio = parsePrice(match[1]);
      if (precio === null) continue;

      entries.push({
        nombre: grain.nombre,
        unidad: '$/t',
        precio,
        variacion: 0,
      });
    }

    return entries;
  }
}
