import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

export interface GrainEntry {
  nombre: string;
  unidad: string;
  precio: number;
  variacion: number;
}

const CACHE_KEY = 'market:granos';
const CACHE_TTL_SECONDS = 6 * 60 * 60;

// API JSON de argentinadatos.com (llamada server-side, sin restricciones CORS)
const ARGENTINADATOS_URL = 'https://www.argentinadatos.com/v1/cotizaciones/granos';

// Fallback: pizarra BCR vía HTML scraping
const PIZARRA_URL = 'https://www.cac.bcr.com.ar/es/precios-de-pizarra';

// Reference prices updated periodically — better to show approximate data than nothing
const REFERENCE_PRICES: GrainEntry[] = [
  { nombre: 'Soja', unidad: '$/t', precio: 395000, variacion: 0 },
  { nombre: 'Maíz', unidad: '$/t', precio: 245000, variacion: 0 },
  { nombre: 'Trigo', unidad: '$/t', precio: 280000, variacion: 0 },
  { nombre: 'Girasol', unidad: '$/t', precio: 620000, variacion: 0 },
  { nombre: 'Sorgo', unidad: '$/t', precio: 220000, variacion: 0 },
];

const GRAINS = [
  { key: 'soja', nombre: 'Soja' },
  { key: 'maiz', nombre: 'Maíz' },
  { key: 'trigo', nombre: 'Trigo' },
  { key: 'girasol', nombre: 'Girasol' },
  { key: 'sorgo', nombre: 'Sorgo' },
];

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

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

    // 1. Try argentinadatos JSON API
    try {
      const entries = await this.fetchArgentinadatos();
      if (entries.length > 0) {
        await this.redis.setJson(CACHE_KEY, entries, CACHE_TTL_SECONDS);
        await this.redis.setJson(`${CACHE_KEY}:stale`, entries);
        return entries;
      }
    } catch (err) {
      this.logger.warn(`argentinadatos falló: ${(err as Error).message}`);
    }

    // 2. Fallback: BCR HTML scraper
    try {
      const entries = await this.fetchBCR();
      if (entries.length > 0) {
        await this.redis.setJson(CACHE_KEY, entries, CACHE_TTL_SECONDS);
        await this.redis.setJson(`${CACHE_KEY}:stale`, entries);
        return entries;
      }
    } catch (err) {
      this.logger.warn(`BCR scraper falló: ${(err as Error).message}`);
    }

    // 3. Serve stale data if any source worked before
    const stale = await this.redis.getJson<GrainEntry[]>(`${CACHE_KEY}:stale`);
    if (stale) return stale;

    // 4. Last resort: reference prices (BCR Rosario approximate values)
    this.logger.warn('Usando precios de referencia estáticos (todas las fuentes fallaron)');
    return REFERENCE_PRICES;
  }

  private async fetchArgentinadatos(): Promise<GrainEntry[]> {
    const res = await fetch(ARGENTINADATOS_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; LogiguayBot/1.0)',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);

    // Response is an array of objects like:
    // [{ "cereal": "Soja", "precioActual": 350000, "variacion": 0.5 }, ...]
    // or [{ "nombre": "Soja", "precio": 350000, "variacion": 0.5 }, ...]
    const raw: any[] = await res.json();
    if (!Array.isArray(raw)) throw new Error(`respuesta no es un array: ${JSON.stringify(raw).slice(0, 200)}`);
    this.logger.debug(`argentinadatos devolvió ${raw.length} items. Ejemplo: ${JSON.stringify(raw[0])}`);


    const nameMap: Record<string, string> = {
      soja: 'Soja', maiz: 'Maíz', maíz: 'Maíz', trigo: 'Trigo',
      girasol: 'Girasol', sorgo: 'Sorgo',
    };

    return raw
      .map((item): GrainEntry | null => {
        const rawName: string = (item.cereal ?? item.nombre ?? item.name ?? '').toString();
        const normName = normalize(rawName);
        const nombre = nameMap[normName] ?? rawName;
        const precio = Number(item.precioActual ?? item.precio ?? item.price ?? 0);
        const variacion = Number(item.variacion ?? item.var ?? 0);
        if (!nombre || precio <= 0) return null;
        return { nombre, unidad: '$/t', precio, variacion };
      })
      .filter((e): e is GrainEntry => e !== null);
  }

  private async fetchBCR(): Promise<GrainEntry[]> {
    const res = await fetch(PIZARRA_URL, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; LogiguayBot/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`upstream status ${res.status}`);

    const html = await res.text();
    return this.parsePizarra(html);
  }

  private parsePizarra(html: string): GrainEntry[] {
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

      const window = text.slice(idx, idx + 200);
      const match = window.match(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{4,}(?:,\d+)?)/);
      if (!match) continue;

      const precio = parsePrice(match[1]);
      if (precio === null) continue;

      entries.push({ nombre: grain.nombre, unidad: '$/t', precio, variacion: 0 });
    }

    return entries;
  }
}
