export const LOCAL_WEATHER_UPDATE_EVENT = 'tbo:local-weather-update';

export interface LocalWeatherSnapshot {
  temperatureF: number;
  weatherCode: number;
  isDay: boolean;
}

export type OpenMeteoWeatherCondition =
  | 'clear'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'mixed'
  | 'storm';

export interface OpenMeteoWeatherCodeOption {
  code: number;
  label: string;
  condition: OpenMeteoWeatherCondition;
}

export const OPEN_METEO_WEATHER_CODE_OPTIONS: readonly OpenMeteoWeatherCodeOption[] = [
  { code: 0, label: 'Clear sky', condition: 'clear' },
  { code: 1, label: 'Mainly clear', condition: 'clear' },
  { code: 2, label: 'Partly cloudy', condition: 'cloudy' },
  { code: 3, label: 'Overcast', condition: 'cloudy' },
  { code: 45, label: 'Fog', condition: 'fog' },
  { code: 48, label: 'Depositing rime fog', condition: 'fog' },
  { code: 51, label: 'Light drizzle', condition: 'rain' },
  { code: 53, label: 'Moderate drizzle', condition: 'rain' },
  { code: 55, label: 'Dense drizzle', condition: 'rain' },
  { code: 56, label: 'Light freezing drizzle', condition: 'mixed' },
  { code: 57, label: 'Dense freezing drizzle', condition: 'mixed' },
  { code: 61, label: 'Slight rain', condition: 'rain' },
  { code: 63, label: 'Moderate rain', condition: 'rain' },
  { code: 65, label: 'Heavy rain', condition: 'rain' },
  { code: 66, label: 'Light freezing rain', condition: 'mixed' },
  { code: 67, label: 'Heavy freezing rain', condition: 'mixed' },
  { code: 71, label: 'Slight snowfall', condition: 'snow' },
  { code: 73, label: 'Moderate snowfall', condition: 'snow' },
  { code: 75, label: 'Heavy snowfall', condition: 'snow' },
  { code: 77, label: 'Snow grains', condition: 'snow' },
  { code: 80, label: 'Slight rain showers', condition: 'rain' },
  { code: 81, label: 'Moderate rain showers', condition: 'rain' },
  { code: 82, label: 'Violent rain showers', condition: 'rain' },
  { code: 85, label: 'Slight snow showers', condition: 'snow' },
  { code: 86, label: 'Heavy snow showers', condition: 'snow' },
  { code: 95, label: 'Thunderstorm', condition: 'storm' },
  { code: 96, label: 'Thunderstorm with slight hail', condition: 'storm' },
  { code: 99, label: 'Thunderstorm with heavy hail', condition: 'storm' },
] as const;

const OPEN_METEO_CONDITION_BY_CODE = new Map<number, OpenMeteoWeatherCondition>(
  OPEN_METEO_WEATHER_CODE_OPTIONS.map((option) => [option.code, option.condition])
);

export function dispatchLocalWeatherUpdate(snapshot: LocalWeatherSnapshot): void {
  window.dispatchEvent(
    new CustomEvent<LocalWeatherSnapshot>(LOCAL_WEATHER_UPDATE_EVENT, {
      detail: snapshot,
    })
  );
}

export function classifyOpenMeteoWeatherCode(weatherCode: number): OpenMeteoWeatherCondition {
  return OPEN_METEO_CONDITION_BY_CODE.get(weatherCode) ?? 'cloudy';
}
