import { useQuery } from '@tanstack/react-query';

// ── Dollar rates ──────────────────────────────────────────────────────────────

interface DolarEntry {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export interface DollarRates {
  oficial: { compra: number; venta: number; fechaActualizacion: string } | null;
  blue: { compra: number; venta: number; fechaActualizacion: string } | null;
  mep: { compra: number; venta: number; fechaActualizacion: string } | null;
}

export function useDollarRates() {
  return useQuery<DollarRates>({
    queryKey: ['market-dollar-rates'],
    queryFn: async () => {
      const res = await fetch('https://dolarapi.com/v1/dolares');
      if (!res.ok) throw new Error('Error fetching dollar rates');
      const data: DolarEntry[] = await res.json();
      const find = (casa: string) => data.find((d) => d.casa === casa) ?? null;
      const map = (d: DolarEntry | null) =>
        d ? { compra: d.compra, venta: d.venta, fechaActualizacion: d.fechaActualizacion } : null;
      return {
        oficial: map(find('oficial')),
        blue: map(find('blue')),
        mep: map(find('mep')),
      };
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

// ── Grain prices ──────────────────────────────────────────────────────────────

export interface GrainEntry {
  nombre: string;
  unidad: string;
  precio: number;
  variacion: number;
}

const GRAIN_NAMES = ['soja', 'maiz', 'maíz', 'trigo'];

export function useGrainPrices() {
  return useQuery<GrainEntry[]>({
    queryKey: ['market-grain-prices'],
    queryFn: async () => {
      const res = await fetch('https://argentinadatos.com/api/v1/cotizaciones/granos');
      if (!res.ok) throw new Error('Error fetching grain prices');
      const data: GrainEntry[] = await res.json();
      return data.filter((g) =>
        GRAIN_NAMES.some((name) => g.nombre.toLowerCase().includes(name)),
      );
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

// ── Weather ───────────────────────────────────────────────────────────────────

export interface WeatherData {
  temp: number;
  description: string;
  windspeed: number;
}

function weatherCodeToDescription(code: number): string {
  if (code === 0) return 'Despejado';
  if (code >= 1 && code <= 3) return 'Parcialmente nublado';
  if (code === 45 || code === 48) return 'Niebla';
  if (code >= 51 && code <= 67) return 'Lluvia';
  if (code >= 71 && code <= 77) return 'Nieve';
  if (code >= 80 && code <= 82) return 'Chubascos';
  if (code >= 95 && code <= 99) return 'Tormenta';
  return 'Sin datos';
}

export function useWeather(lat = -34.6037, lng = -58.3816) {
  return useQuery<WeatherData>({
    queryKey: ['market-weather', lat, lng],
    queryFn: async () => {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,weathercode,windspeed_10m` +
        `&timezone=America/Argentina/Buenos_Aires`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error fetching weather');
      const data = await res.json();
      const current = data.current;
      return {
        temp: current.temperature_2m,
        description: weatherCodeToDescription(current.weathercode),
        windspeed: current.windspeed_10m,
      };
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
