const BASE_ICON_SIZE = 64;
const DEFAULT_ICON_SIZE = 24;

interface IconRecipe {
  showSkyBody: boolean;
  cloudScale: number;
  rainDrops: number;
  snowFlakes: number;
  hailStones: number;
  lightning: boolean;
  windLines: number;
  fogLines: number;
}

const DEFAULT_RECIPE: IconRecipe = {
  showSkyBody: false,
  cloudScale: 1,
  rainDrops: 0,
  snowFlakes: 0,
  hailStones: 0,
  lightning: false,
  windLines: 0,
  fogLines: 0,
};

function makeRecipe(overrides: Partial<IconRecipe>): IconRecipe {
  return { ...DEFAULT_RECIPE, ...overrides };
}

const RECIPES = {
  clear: makeRecipe({ showSkyBody: true, cloudScale: 0 }),
  mostlyClear: makeRecipe({ showSkyBody: true, cloudScale: 0.74 }),
  partlyCloudy: makeRecipe({ showSkyBody: true, cloudScale: 0.92 }),
  mostlyCloudy: makeRecipe({ showSkyBody: true, cloudScale: 1.04 }),
  cloudy: makeRecipe({ cloudScale: 1.12 }),
  windy: makeRecipe({ cloudScale: 1.06, windLines: 2 }),
  windRain: makeRecipe({ cloudScale: 1.05, windLines: 2, rainDrops: 2 }),
  chanceShowers: makeRecipe({ showSkyBody: true, cloudScale: 0.95, rainDrops: 1 }),
  showers: makeRecipe({ cloudScale: 1.02, rainDrops: 3 }),
  heavyShowers: makeRecipe({ cloudScale: 1.05, rainDrops: 4 }),
  lightRain: makeRecipe({ cloudScale: 1, rainDrops: 2 }),
  rain: makeRecipe({ cloudScale: 1.02, rainDrops: 3 }),
  heavyRain: makeRecipe({ cloudScale: 1.05, rainDrops: 5 }),
  chanceSnow: makeRecipe({ showSkyBody: true, cloudScale: 0.95, snowFlakes: 1 }),
  snowShowers: makeRecipe({ cloudScale: 1.02, snowFlakes: 2 }),
  heavySnowShowers: makeRecipe({ cloudScale: 1.05, snowFlakes: 3 }),
  lightSnow: makeRecipe({ cloudScale: 1, snowFlakes: 1 }),
  snow: makeRecipe({ cloudScale: 1.02, snowFlakes: 2 }),
  heavySnow: makeRecipe({ cloudScale: 1.06, snowFlakes: 4 }),
  snowstorm: makeRecipe({ cloudScale: 1.06, snowFlakes: 3, windLines: 2 }),
  rainAndSnow: makeRecipe({ cloudScale: 1.03, rainDrops: 2, snowFlakes: 2 }),
  hail: makeRecipe({ cloudScale: 1.02, hailStones: 3 }),
  hailShowers: makeRecipe({ cloudScale: 1.04, hailStones: 4 }),
  thunderstorm: makeRecipe({ cloudScale: 1.05, lightning: true, rainDrops: 2 }),
  thundershower: makeRecipe({ cloudScale: 1.05, lightning: true, rainDrops: 3 }),
  heavyThunderstorm: makeRecipe({ cloudScale: 1.08, lightning: true, rainDrops: 4 }),
  foggy: makeRecipe({ cloudScale: 1.04, fogLines: 2 }),
} as const;

export const GOOGLE_WEATHER_ICON_TYPES = [
  'TYPE_UNSPECIFIED',
  'CLEAR',
  'MOSTLY_CLEAR',
  'PARTLY_CLOUDY',
  'MOSTLY_CLOUDY',
  'CLOUDY',
  'WINDY',
  'WIND_AND_RAIN',
  'LIGHT_RAIN_SHOWERS',
  'CHANCE_OF_SHOWERS',
  'SCATTERED_SHOWERS',
  'RAIN_SHOWERS',
  'HEAVY_RAIN_SHOWERS',
  'LIGHT_TO_MODERATE_RAIN',
  'MODERATE_TO_HEAVY_RAIN',
  'RAIN',
  'LIGHT_RAIN',
  'HEAVY_RAIN',
  'RAIN_PERIODICALLY_HEAVY',
  'LIGHT_SNOW_SHOWERS',
  'CHANCE_OF_SNOW_SHOWERS',
  'SCATTERED_SNOW_SHOWERS',
  'SNOW_SHOWERS',
  'HEAVY_SNOW_SHOWERS',
  'LIGHT_TO_MODERATE_SNOW',
  'MODERATE_TO_HEAVY_SNOW',
  'SNOW',
  'LIGHT_SNOW',
  'HEAVY_SNOW',
  'SNOWSTORM',
  'SNOW_PERIODICALLY_HEAVY',
  'HEAVY_SNOW_STORM',
  'BLOWING_SNOW',
  'RAIN_AND_SNOW',
  'HAIL',
  'HAIL_SHOWERS',
  'THUNDERSTORM',
  'THUNDERSHOWER',
  'LIGHT_THUNDERSTORM_RAIN',
  'SCATTERED_THUNDERSTORMS',
  'HEAVY_THUNDERSTORM',
] as const;

export type GoogleWeatherIconType = (typeof GOOGLE_WEATHER_ICON_TYPES)[number];

const GOOGLE_ICON_RECIPES: Record<GoogleWeatherIconType, IconRecipe> = {
  TYPE_UNSPECIFIED: RECIPES.partlyCloudy,
  CLEAR: RECIPES.clear,
  MOSTLY_CLEAR: RECIPES.mostlyClear,
  PARTLY_CLOUDY: RECIPES.partlyCloudy,
  MOSTLY_CLOUDY: RECIPES.mostlyCloudy,
  CLOUDY: RECIPES.cloudy,
  WINDY: RECIPES.windy,
  WIND_AND_RAIN: RECIPES.windRain,
  LIGHT_RAIN_SHOWERS: RECIPES.chanceShowers,
  CHANCE_OF_SHOWERS: RECIPES.chanceShowers,
  SCATTERED_SHOWERS: RECIPES.chanceShowers,
  RAIN_SHOWERS: RECIPES.showers,
  HEAVY_RAIN_SHOWERS: RECIPES.heavyShowers,
  LIGHT_TO_MODERATE_RAIN: RECIPES.lightRain,
  MODERATE_TO_HEAVY_RAIN: RECIPES.heavyRain,
  RAIN: RECIPES.rain,
  LIGHT_RAIN: RECIPES.lightRain,
  HEAVY_RAIN: RECIPES.heavyRain,
  RAIN_PERIODICALLY_HEAVY: RECIPES.heavyRain,
  LIGHT_SNOW_SHOWERS: RECIPES.chanceSnow,
  CHANCE_OF_SNOW_SHOWERS: RECIPES.chanceSnow,
  SCATTERED_SNOW_SHOWERS: RECIPES.chanceSnow,
  SNOW_SHOWERS: RECIPES.snowShowers,
  HEAVY_SNOW_SHOWERS: RECIPES.heavySnowShowers,
  LIGHT_TO_MODERATE_SNOW: RECIPES.lightSnow,
  MODERATE_TO_HEAVY_SNOW: RECIPES.heavySnow,
  SNOW: RECIPES.snow,
  LIGHT_SNOW: RECIPES.lightSnow,
  HEAVY_SNOW: RECIPES.heavySnow,
  SNOWSTORM: RECIPES.snowstorm,
  SNOW_PERIODICALLY_HEAVY: RECIPES.heavySnow,
  HEAVY_SNOW_STORM: RECIPES.snowstorm,
  BLOWING_SNOW: RECIPES.snowstorm,
  RAIN_AND_SNOW: RECIPES.rainAndSnow,
  HAIL: RECIPES.hail,
  HAIL_SHOWERS: RECIPES.hailShowers,
  THUNDERSTORM: RECIPES.thunderstorm,
  THUNDERSHOWER: RECIPES.thundershower,
  LIGHT_THUNDERSTORM_RAIN: RECIPES.thunderstorm,
  SCATTERED_THUNDERSTORMS: RECIPES.thundershower,
  HEAVY_THUNDERSTORM: RECIPES.heavyThunderstorm,
};

interface DrawOverrides {
  fogLines?: number;
  hailStones?: number;
}

export function drawGoogleWeatherIcon(
  canvas: HTMLCanvasElement,
  iconType: GoogleWeatherIconType,
  isDay: boolean,
  size = DEFAULT_ICON_SIZE
): void {
  const ctx = prepareCanvasContext(canvas, size);
  if (!ctx) {
    return;
  }

  const recipe = GOOGLE_ICON_RECIPES[iconType];
  drawIconRecipe(ctx, size, recipe, isDay);
}

export function drawWeatherIcon(
  canvas: HTMLCanvasElement,
  weatherCode: number | null,
  isDay: boolean,
  size = DEFAULT_ICON_SIZE
): void {
  const ctx = prepareCanvasContext(canvas, size);
  if (!ctx) {
    return;
  }

  const iconType = mapOpenMeteoToGoogleIconType(weatherCode);
  const recipe = GOOGLE_ICON_RECIPES[iconType];
  const overrides = getOpenMeteoDrawOverrides(weatherCode);
  drawIconRecipe(ctx, size, recipe, isDay, overrides);
}

export function mapOpenMeteoToGoogleIconType(weatherCode: number | null): GoogleWeatherIconType {
  if (weatherCode === null) {
    return 'TYPE_UNSPECIFIED';
  }

  switch (weatherCode) {
    case 0:
      return 'CLEAR';
    case 1:
      return 'MOSTLY_CLEAR';
    case 2:
      return 'PARTLY_CLOUDY';
    case 3:
      return 'CLOUDY';
    case 45:
    case 48:
      return 'CLOUDY';
    case 51:
      return 'LIGHT_RAIN';
    case 53:
      return 'LIGHT_TO_MODERATE_RAIN';
    case 55:
      return 'RAIN';
    case 56:
    case 57:
      return 'RAIN_AND_SNOW';
    case 61:
      return 'LIGHT_TO_MODERATE_RAIN';
    case 63:
      return 'RAIN';
    case 65:
      return 'HEAVY_RAIN';
    case 66:
    case 67:
      return 'RAIN_AND_SNOW';
    case 71:
      return 'LIGHT_SNOW';
    case 73:
      return 'SNOW';
    case 75:
      return 'HEAVY_SNOW';
    case 77:
      return 'SNOW';
    case 80:
      return 'LIGHT_RAIN_SHOWERS';
    case 81:
      return 'RAIN_SHOWERS';
    case 82:
      return 'HEAVY_RAIN_SHOWERS';
    case 85:
      return 'LIGHT_SNOW_SHOWERS';
    case 86:
      return 'HEAVY_SNOW_SHOWERS';
    case 95:
      return 'THUNDERSTORM';
    case 96:
      return 'THUNDERSHOWER';
    case 99:
      return 'HEAVY_THUNDERSTORM';
    default:
      return 'TYPE_UNSPECIFIED';
  }
}

function getOpenMeteoDrawOverrides(weatherCode: number | null): DrawOverrides {
  if (weatherCode === 45 || weatherCode === 48) {
    return { fogLines: 3 };
  }
  if (weatherCode === 96 || weatherCode === 99) {
    return { hailStones: 2 };
  }
  return {};
}

function drawIconRecipe(
  ctx: CanvasRenderingContext2D,
  size: number,
  recipe: IconRecipe,
  isDay: boolean,
  overrides: DrawOverrides = {}
): void {
  drawInIconSpace(ctx, size, () => {
    const cloudScale = recipe.cloudScale;
    const hasCloud = cloudScale > 0;

    if (recipe.showSkyBody) {
      if (hasCloud) {
        drawSkyBody(ctx, isDay, 23, 21, 12);
      } else {
        drawSkyBody(ctx, isDay, 32, 32, 14);
      }
    }

    if (hasCloud) {
      drawCloud(ctx, 33, 35, cloudScale);
    }

    if (recipe.windLines > 0) {
      drawWindLines(ctx, 17, 47, 30, recipe.windLines);
    }

    const fogLines = overrides.fogLines ?? recipe.fogLines;
    if (fogLines > 0) {
      drawFogLines(ctx, 15, 46, 34, fogLines);
    }

    if (recipe.rainDrops > 0) {
      drawRainDrops(ctx, 21, 46, recipe.rainDrops);
    }

    if (recipe.snowFlakes > 0) {
      drawSnowFlakes(ctx, 23, 48, recipe.snowFlakes);
    }

    const hailStones = recipe.hailStones + (overrides.hailStones ?? 0);
    if (hailStones > 0) {
      drawHailStones(ctx, 22, 49, hailStones);
    }

    if (recipe.lightning) {
      drawLightning(ctx, 35, 42);
    }
  });
}

function prepareCanvasContext(
  canvas: HTMLCanvasElement,
  size: number
): CanvasRenderingContext2D | null {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const pixelSize = Math.round(size * dpr);
  if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
    canvas.width = pixelSize;
    canvas.height = pixelSize;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  return ctx;
}

function drawInIconSpace(
  ctx: CanvasRenderingContext2D,
  size: number,
  draw: () => void
): void {
  const scale = size / BASE_ICON_SIZE;
  ctx.save();
  ctx.scale(scale, scale);
  draw();
  ctx.restore();
}

function drawSkyBody(
  ctx: CanvasRenderingContext2D,
  isDay: boolean,
  x: number,
  y: number,
  radius: number
): void {
  if (isDay) {
    drawSun(ctx, x, y, radius);
  } else {
    drawMoon(ctx, x, y, radius);
  }
}

function drawSun(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void {
  ctx.save();

  ctx.strokeStyle = '#fbbc04';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * i) / 4;
    const inner = radius + 3;
    const outer = radius + 8;
    const x1 = x + Math.cos(angle) * inner;
    const y1 = y + Math.sin(angle) * inner;
    const x2 = x + Math.cos(angle) * outer;
    const y2 = y + Math.sin(angle) * outer;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.45, radius * 0.2, x, y, radius);
  gradient.addColorStop(0, '#ffe7a6');
  gradient.addColorStop(1, '#f9ab00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMoon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void {
  ctx.save();

  const gradient = ctx.createLinearGradient(x, y - radius, x, y + radius);
  gradient.addColorStop(0, '#78a9ff');
  gradient.addColorStop(1, '#4d86f8');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x + radius * 0.52, y - radius * 0.1, radius * 0.84, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.24, y - radius * 0.32, radius * 0.24, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const gradient = ctx.createLinearGradient(0, -18, 0, 12);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(1, '#dde6f2');

  ctx.shadowColor = 'rgba(13, 35, 71, 0.2)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.moveTo(-16, 10);
  ctx.bezierCurveTo(-22, 10, -24, 3, -20, -1);
  ctx.bezierCurveTo(-19, -8, -10, -11, -4, -7);
  ctx.bezierCurveTo(0, -14, 13, -14, 17, -5);
  ctx.bezierCurveTo(24, -5, 27, 0, 27, 6);
  ctx.bezierCurveTo(27, 11, 23, 14, 18, 14);
  ctx.lineTo(-15, 14);
  ctx.bezierCurveTo(-20, 14, -23, 12, -24, 9);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.ellipse(-4, -5, 9, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRainDrops(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  count: number
): void {
  const spacing = count === 1 ? 0 : 8;
  const left = startX - ((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i += 1) {
    drawRainDrop(ctx, left + i * spacing, y + ((i + 1) % 2 === 0 ? 2 : 0), 4.2);
  }
}

function drawRainDrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const gradient = ctx.createLinearGradient(x, y, x, y + size * 2.4);
  gradient.addColorStop(0, '#86c8ff');
  gradient.addColorStop(1, '#4285f4');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + size * 0.95, y + size, x, y + size * 2.4);
  ctx.quadraticCurveTo(x - size * 0.95, y + size, x, y);
  ctx.fill();
}

function drawSnowFlakes(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  count: number
): void {
  const spacing = count === 1 ? 0 : 8;
  const left = startX - ((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i += 1) {
    drawSnowFlake(ctx, left + i * spacing, y + ((i + 1) % 2 === 0 ? 2 : 0), 3.7);
  }
}

function drawSnowFlake(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  ctx.strokeStyle = '#72b8ff';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i += 1) {
    const angle = (Math.PI * i) / 3;
    const dx = Math.cos(angle) * size;
    const dy = Math.sin(angle) * size;
    ctx.beginPath();
    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHailStones(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  count: number
): void {
  const spacing = count === 1 ? 0 : 7;
  const left = startX - ((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i += 1) {
    const x = left + i * spacing;
    const gradient = ctx.createLinearGradient(x, y - 2, x, y + 2);
    gradient.addColorStop(0, '#d9f2ff');
    gradient.addColorStop(1, '#8ec5f3');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y + ((i + 1) % 2 === 0 ? 1.5 : 0), 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLightning(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  const gradient = ctx.createLinearGradient(x, y, x, y + 14);
  gradient.addColorStop(0, '#ffe28a');
  gradient.addColorStop(1, '#fbbc04');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x - 2, y);
  ctx.lineTo(x + 3, y);
  ctx.lineTo(x - 0.8, y + 6);
  ctx.lineTo(x + 3.8, y + 6);
  ctx.lineTo(x - 3.2, y + 14);
  ctx.lineTo(x - 0.8, y + 8.5);
  ctx.lineTo(x - 4.2, y + 8.5);
  ctx.closePath();
  ctx.fill();
}

function drawWindLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  rows: number
): void {
  ctx.save();
  ctx.strokeStyle = '#6ab3ff';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (let i = 0; i < rows; i += 1) {
    const rowY = y + i * 4.8;
    ctx.beginPath();
    ctx.moveTo(x, rowY);
    ctx.quadraticCurveTo(x + width * 0.55, rowY - 2, x + width, rowY + 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFogLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  rows: number
): void {
  ctx.save();
  ctx.strokeStyle = '#9db7d1';
  ctx.lineWidth = 2.1;
  ctx.lineCap = 'round';
  for (let i = 0; i < rows; i += 1) {
    const rowY = y + i * 4;
    ctx.beginPath();
    ctx.moveTo(x, rowY);
    ctx.lineTo(x + width, rowY);
    ctx.stroke();
  }
  ctx.restore();
}
