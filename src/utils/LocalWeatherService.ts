import { dispatchLocalWeatherUpdate } from './LocalWeather';

interface WeatherApiResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
  };
}

interface IpGeoResponse {
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lon?: number | string;
  loc?: string;
  success?: boolean;
}

const DEFAULT_REFRESH_MS = 15 * 60 * 1000;

export class LocalWeatherService {
  private readonly refreshMs: number;
  private refreshTimer: number | null = null;
  private weatherInFlight = false;
  private weatherCoords: { latitude: number; longitude: number } | null = null;

  constructor(refreshMs = DEFAULT_REFRESH_MS) {
    this.refreshMs = refreshMs;
  }

  start(): void {
    if (this.refreshTimer !== null) {
      return;
    }

    this.publishFallbackSnapshot();
    void this.refreshWeather();

    this.refreshTimer = window.setInterval(() => {
      void this.refreshWeather();
    }, this.refreshMs);
  }

  stop(): void {
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.weatherInFlight = false;
  }

  private publishFallbackSnapshot(): void {
    dispatchLocalWeatherUpdate({
      temperatureF: 68,
      weatherCode: 2,
      isDay: this.isLocalDay(new Date()),
    });
  }

  private async refreshWeather(): Promise<void> {
    if (this.weatherInFlight) {
      return;
    }

    this.weatherInFlight = true;

    try {
      if (!this.weatherCoords) {
        this.weatherCoords = await this.resolveWeatherCoordinates();
      }
      if (!this.weatherCoords) {
        throw new Error('Coordinates unavailable');
      }

      const { latitude, longitude } = this.weatherCoords;
      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        '&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto';

      const response = await fetch(weatherUrl);
      if (!response.ok) {
        throw new Error(`Weather request failed: ${response.status}`);
      }

      const payload = (await response.json()) as WeatherApiResponse;
      const current = payload.current;
      if (
        !current ||
        typeof current.temperature_2m !== 'number' ||
        typeof current.weather_code !== 'number' ||
        typeof current.is_day !== 'number'
      ) {
        throw new Error('Weather payload missing current data');
      }

      dispatchLocalWeatherUpdate({
        temperatureF: current.temperature_2m,
        weatherCode: current.weather_code,
        isDay: current.is_day === 1,
      });
    } catch (error) {
      console.warn('Failed to refresh local weather.', error);
    } finally {
      this.weatherInFlight = false;
    }
  }

  private async resolveWeatherCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
    return this.getCoordinatesFromIp();
  }

  private async getCoordinatesFromIp(): Promise<{ latitude: number; longitude: number } | null> {
    const endpoints = [
      'https://ipwho.is/',
      'https://ipapi.co/json/',
      'https://ipinfo.io/json',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as IpGeoResponse;
        if (payload.success === false) {
          continue;
        }

        const directLat = this.parseCoordinate(payload.latitude ?? payload.lat);
        const directLon = this.parseCoordinate(payload.longitude ?? payload.lon);
        if (directLat !== null && directLon !== null) {
          return { latitude: directLat, longitude: directLon };
        }

        if (typeof payload.loc === 'string') {
          const [latText, lonText] = payload.loc.split(',');
          const locLat = this.parseCoordinate(latText);
          const locLon = this.parseCoordinate(lonText);
          if (locLat !== null && locLon !== null) {
            return { latitude: locLat, longitude: locLon };
          }
        }
      } catch {
        // Try the next endpoint.
      }
    }

    return null;
  }

  private parseCoordinate(value: number | string | undefined): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private isLocalDay(now: Date): boolean {
    const hour = now.getHours();
    return hour >= 6 && hour < 18;
  }
}
