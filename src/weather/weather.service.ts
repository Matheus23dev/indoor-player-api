import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GeocodingResponse {
  results?: Array<{
    name?: string;
    admin1?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

interface ForecastResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
}

export interface WeatherSnapshot {
  location: string;
  temperature: string;
  condition: string;
  attribution: string;
  updatedAt: string;
}

const WEATHER_CACHE_MS = 15 * 60_000;
const DEFAULT_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const DEFAULT_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

@Injectable()
export class WeatherService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: WeatherSnapshot }
  >();

  private readonly requests = new Map<string, Promise<WeatherSnapshot>>();

  constructor(private readonly config: ConfigService) {}

  async getCurrent(rawLocation: string) {
    const location = rawLocation.trim();
    const cacheKey = location.toLocaleLowerCase('pt-BR');
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const running = this.requests.get(cacheKey);

    if (running) {
      return running;
    }

    const request = this.loadCurrent(location).finally(() => {
      this.requests.delete(cacheKey);
    });

    this.requests.set(cacheKey, request);

    const value = await request;

    this.cache.set(cacheKey, {
      expiresAt: Date.now() + WEATHER_CACHE_MS,
      value,
    });

    return value;
  }

  private async loadCurrent(location: string): Promise<WeatherSnapshot> {
    const geocodingUrl = this.createUrl(
      this.config.get<string>('WEATHER_GEOCODING_BASE_URL') ??
        DEFAULT_GEOCODING_URL,
      {
        name: location,
        count: '1',
        language: 'pt',
        format: 'json',
      },
    );
    const geocoding = await this.fetchJson<GeocodingResponse>(geocodingUrl);
    const result = geocoding.results?.[0];

    if (
      !result ||
      !Number.isFinite(result.latitude) ||
      !Number.isFinite(result.longitude)
    ) {
      throw new NotFoundException(`Região não encontrada: ${location}.`);
    }

    const forecastUrl = this.createUrl(
      this.config.get<string>('WEATHER_FORECAST_BASE_URL') ??
        DEFAULT_FORECAST_URL,
      {
        latitude: String(result.latitude),
        longitude: String(result.longitude),
        current: 'temperature_2m,weather_code',
        timezone: 'auto',
      },
    );
    const forecast = await this.fetchJson<ForecastResponse>(forecastUrl);
    const temperature = forecast.current?.temperature_2m;

    if (!Number.isFinite(temperature)) {
      throw new BadGatewayException(
        'O provedor não retornou a temperatura atual.',
      );
    }

    return {
      location:
        [result.name, result.admin1].filter(Boolean).join(', ') || location,
      temperature: `${Math.round(temperature!)}°C`,
      condition: this.getWeatherDescription(forecast.current?.weather_code),
      attribution: 'Open-Meteo',
      updatedAt: new Date().toISOString(),
    };
  }

  private createUrl(baseUrl: string, parameters: Record<string, string>) {
    const url = new URL(baseUrl);

    for (const [key, value] of Object.entries(parameters)) {
      url.searchParams.set(key, value);
    }

    const apiKey = this.config.get<string>('WEATHER_API_KEY')?.trim();

    if (apiKey) {
      url.searchParams.set('apikey', apiKey);
    }

    return url;
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error('[WEATHER] Falha no provedor:', error);
      throw new BadGatewayException(
        'Não foi possível atualizar o clima desta região.',
      );
    }
  }

  private getWeatherDescription(code?: number) {
    if (code === 0) return 'Céu limpo';
    if (code === 1 || code === 2) return 'Parcialmente nublado';
    if (code === 3) return 'Nublado';
    if (code === 45 || code === 48) return 'Neblina';
    if (code === 51 || code === 53 || code === 55) return 'Garoa';
    if (code === 56 || code === 57) return 'Garoa congelante';
    if (code === 61 || code === 63 || code === 65) return 'Chuva';
    if (code === 66 || code === 67) return 'Chuva congelante';
    if (code === 71 || code === 73 || code === 75 || code === 77) return 'Neve';
    if (code === 80 || code === 81 || code === 82) return 'Pancadas de chuva';
    if (code === 85 || code === 86) return 'Pancadas de neve';
    if (code === 95 || code === 96 || code === 99) return 'Trovoadas';
    return 'Condição atual';
  }
}
