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

export function dispatchLocalWeatherUpdate(snapshot: LocalWeatherSnapshot): void {
  window.dispatchEvent(
    new CustomEvent<LocalWeatherSnapshot>(LOCAL_WEATHER_UPDATE_EVENT, {
      detail: snapshot,
    })
  );
}

export function classifyOpenMeteoWeatherCode(weatherCode: number): OpenMeteoWeatherCondition {
  switch (weatherCode) {
    case 0:
    case 1:
      return 'clear';
    case 2:
    case 3:
      return 'cloudy';
    case 45:
    case 48:
      return 'fog';
    case 56:
    case 57:
    case 66:
    case 67:
      return 'mixed';
    case 51:
    case 53:
    case 55:
    case 61:
    case 63:
    case 65:
    case 80:
    case 81:
    case 82:
      return 'rain';
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return 'snow';
    case 95:
    case 96:
    case 99:
      return 'storm';
    default:
      return 'cloudy';
  }
}
