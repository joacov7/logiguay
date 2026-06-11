import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

export interface GrainEntry {
  nombre: string;
  unidad: string;
  precio: number;
  variacion: number;
}

const CACHE_KEY = 'market:granos';
const CACHE_TTL_SECONDS = 10 * 60;
const GRAIN_NAMES = ['soja', 'maiz', 'maíz', 'trigo', 'girasol', 'sorgo'];

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(private readonly redis: RedisService) {}

  async getGrainPrices(): Promise<GrainEntry[]> {
    const cached = await this.redis.getJson<GrainEntry[]>(CACHE_KEY);
    if (cached) return cached;

    try {
      const res = await fetch('https://argentinadatos.com/api/v1/cotizaciones/granos', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`upstream status ${res.status}`);

      const data: GrainEntry[] = await res.json();
      const filtered = data.filter((g) =>
        GRAIN_NAMES.some((name) => g.nombre?.toLowerCase().includes(name)),
      );

      await this.redis.setJson(CACHE_KEY, filtered, CACHE_TTL_SECONDS);
      // Copia sin TTL para servir como fallback si la API externa cae
      await this.redis.setJson(`${CACHE_KEY}:stale`, filtered);
      return filtered;
    } catch (err) {
      this.logger.warn(`No se pudo obtener cotización de granos: ${(err as Error).message}`);
      // Stale cache fallback: si la API externa cae, servir el último dato conocido
      const stale = await this.redis.getJson<GrainEntry[]>(`${CACHE_KEY}:stale`);
      if (stale) return stale;
      throw new ServiceUnavailableException('Cotización de granos no disponible');
    }
  }
}
