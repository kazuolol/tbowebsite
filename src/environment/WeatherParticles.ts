import * as THREE from 'three';
import { type OpenMeteoWeatherCondition } from '../utils/LocalWeather';

export interface WeatherParticleState {
  condition: OpenMeteoWeatherCondition;
  weatherCode: number;
  isDay: boolean;
  temperatureF: number;
}

type LayerKind = 'rain' | 'snow' | 'hail' | 'mist' | 'motes';

interface ParticleRecipe {
  rain: number;
  snow: number;
  hail: number;
  mist: number;
  motes: number;
  rainSpeed: number;
  snowSpeed: number;
  hailSpeed: number;
  mistSpeed: number;
  motesSpeed: number;
  rainOpacity: number;
  snowOpacity: number;
  hailOpacity: number;
  mistOpacity: number;
  motesOpacity: number;
  lightningRate: number;
}

interface LayerConfig {
  kind: LayerKind;
  maxCount: number;
  size: number;
  baseOpacity: number;
  dayColor: THREE.ColorRepresentation;
  nightColor: THREE.ColorRepresentation;
  xSpeedRange: [number, number];
  ySpeedRange: [number, number];
  zSpeedRange: [number, number];
  windFactor: number;
  depthFactor: number;
  flutter: number;
  spawnFromTop: boolean;
}

interface ParticleLayer extends LayerConfig {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  texture: THREE.CanvasTexture;
  positions: Float32Array;
  velocities: Float32Array;
  seeds: Float32Array;
  activeCount: number;
  targetCount: number;
  speedMultiplier: number;
  opacityMultiplier: number;
}

interface LightningBolt {
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  positions: Float32Array;
  active: boolean;
  life: number;
  maxLife: number;
}

const VOLUME = {
  minX: -64,
  maxX: 64,
  minY: -40,
  maxY: 70,
  minZ: -190,
  maxZ: 46,
};

const DRAW_ORDER = 4;
const RAIN_DENSITY_MULTIPLIER = 1.45;
const SNOW_DENSITY_MULTIPLIER = 1.5;
const HAIL_DENSITY_MULTIPLIER = 1.35;
const STORM_DENSITY_EXTRA_MULTIPLIER = 1.2;
const PRECIPITATION_OPACITY_MULTIPLIER = 1.12;
const LIGHTNING_POOL_SIZE = 10;
const LIGHTNING_MAX_SEGMENTS = 10;

export class WeatherParticles {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private time = 0;

  private readonly rainLayer: ParticleLayer;
  private readonly snowLayer: ParticleLayer;
  private readonly hailLayer: ParticleLayer;
  private readonly mistLayer: ParticleLayer;
  private readonly motesLayer: ParticleLayer;
  private readonly layers: ParticleLayer[];

  private readonly bolts: LightningBolt[] = [];
  private stormActive = false;
  private lightningRate = 0;

  private readonly wind = new THREE.Vector2();
  private readonly targetWind = new THREE.Vector2();
  private worldSpeed = 12;
  private targetWorldSpeed = 12;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'WeatherParticles';
    this.group.renderOrder = DRAW_ORDER;
    this.scene.add(this.group);

    this.rainLayer = this.createLayer({
      kind: 'rain',
      maxCount: 2600,
      size: 1.15,
      baseOpacity: 0.9,
      dayColor: 0xaad8ff,
      nightColor: 0x9ec0e0,
      xSpeedRange: [-1.8, 1.8],
      ySpeedRange: [-68, -44],
      zSpeedRange: [3.2, 10.5],
      windFactor: 1.55,
      depthFactor: 0.24,
      flutter: 0.15,
      spawnFromTop: true,
    });

    this.snowLayer = this.createLayer({
      kind: 'snow',
      maxCount: 2200,
      size: 1.9,
      baseOpacity: 0.98,
      dayColor: 0xffffff,
      nightColor: 0xdbe7f6,
      xSpeedRange: [-1.1, 1.1],
      ySpeedRange: [-10.5, -3.6],
      zSpeedRange: [0.35, 2.7],
      windFactor: 3.4,
      depthFactor: 0.09,
      flutter: 2.3,
      spawnFromTop: true,
    });

    this.hailLayer = this.createLayer({
      kind: 'hail',
      maxCount: 1200,
      size: 1.35,
      baseOpacity: 0.95,
      dayColor: 0xe3f4ff,
      nightColor: 0xbdd8ef,
      xSpeedRange: [-3.2, 3.2],
      ySpeedRange: [-58, -32],
      zSpeedRange: [1.4, 7.8],
      windFactor: 2.35,
      depthFactor: 0.2,
      flutter: 0.22,
      spawnFromTop: true,
    });

    this.mistLayer = this.createLayer({
      kind: 'mist',
      maxCount: 0,
      size: 0.01,
      baseOpacity: 0,
      dayColor: 0xdce8f4,
      nightColor: 0xa8b5c4,
      xSpeedRange: [-1.25, 1.25],
      ySpeedRange: [-0.5, 0.45],
      zSpeedRange: [0.15, 1.9],
      windFactor: 1.7,
      depthFactor: 0.06,
      flutter: 0.8,
      spawnFromTop: false,
    });

    this.motesLayer = this.createLayer({
      kind: 'motes',
      maxCount: 0,
      size: 0.01,
      baseOpacity: 0,
      dayColor: 0xf6fbff,
      nightColor: 0xc9d6e6,
      xSpeedRange: [-0.6, 0.6],
      ySpeedRange: [-0.28, 0.28],
      zSpeedRange: [0.1, 0.9],
      windFactor: 1.05,
      depthFactor: 0.05,
      flutter: 0.95,
      spawnFromTop: false,
    });

    this.layers = [
      this.rainLayer,
      this.snowLayer,
      this.hailLayer,
      this.mistLayer,
      this.motesLayer,
    ];
    this.initializeLightningPool();
  }

  public setWeatherState(state: WeatherParticleState): void {
    const recipe = this.getRecipeForWeather(state);
    const stormBoost = state.condition === 'storm' ? STORM_DENSITY_EXTRA_MULTIPLIER : 1;
    const rainDensity = RAIN_DENSITY_MULTIPLIER * stormBoost;
    const snowDensity = SNOW_DENSITY_MULTIPLIER * stormBoost;
    const hailDensity = HAIL_DENSITY_MULTIPLIER * stormBoost;

    this.rainLayer.targetCount = this.clampCount(
      recipe.rain * rainDensity,
      this.rainLayer.maxCount
    );
    this.snowLayer.targetCount = this.clampCount(
      recipe.snow * snowDensity,
      this.snowLayer.maxCount
    );
    this.hailLayer.targetCount = this.clampCount(
      recipe.hail * hailDensity,
      this.hailLayer.maxCount
    );
    this.mistLayer.targetCount = 0;
    this.motesLayer.targetCount = 0;

    this.rainLayer.speedMultiplier = recipe.rainSpeed;
    this.snowLayer.speedMultiplier = recipe.snowSpeed;
    this.hailLayer.speedMultiplier = recipe.hailSpeed;
    this.mistLayer.speedMultiplier = 0;
    this.motesLayer.speedMultiplier = 0;

    this.rainLayer.opacityMultiplier = recipe.rainOpacity * PRECIPITATION_OPACITY_MULTIPLIER;
    this.snowLayer.opacityMultiplier = recipe.snowOpacity * PRECIPITATION_OPACITY_MULTIPLIER;
    this.hailLayer.opacityMultiplier = recipe.hailOpacity * PRECIPITATION_OPACITY_MULTIPLIER;
    this.mistLayer.opacityMultiplier = 0;
    this.motesLayer.opacityMultiplier = 0;

    this.stormActive =
      state.condition === 'storm' ||
      state.weatherCode === 95 ||
      state.weatherCode === 96 ||
      state.weatherCode === 99;
    this.lightningRate = recipe.lightningRate;

    this.applyPalette(state.isDay);
    this.applyLayerOpacities();
  }

  public setWind(windX: number, windY: number, worldSpeed: number): void {
    this.targetWind.set(windX, windY);
    this.targetWorldSpeed = worldSpeed;
  }

  public update(delta: number): void {
    this.time += delta;

    const blend = 1 - Math.exp(-delta * 3.4);
    this.wind.lerp(this.targetWind, blend);
    this.worldSpeed = THREE.MathUtils.lerp(this.worldSpeed, this.targetWorldSpeed, blend);

    for (const layer of this.layers) {
      this.updateLayerActiveCount(layer, delta);
      this.updateLayerParticles(layer, delta);
    }

    this.updateLightning(delta);
  }

  public dispose(): void {
    this.scene.remove(this.group);

    for (const bolt of this.bolts) {
      this.group.remove(bolt.line);
      bolt.geometry.dispose();
      bolt.material.dispose();
    }
    this.bolts.length = 0;

    for (const layer of this.layers) {
      this.group.remove(layer.points);
      layer.geometry.dispose();
      layer.material.dispose();
      layer.texture.dispose();
    }
  }

  private createLayer(config: LayerConfig): ParticleLayer {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.maxCount * 3);
    const velocities = new Float32Array(config.maxCount * 3);
    const seeds = new Float32Array(config.maxCount);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    const texture = this.createParticleTexture(config.kind);
    const material = new THREE.PointsMaterial({
      color: config.dayColor,
      size: config.size,
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: config.baseOpacity,
      sizeAttenuation: true,
      alphaTest: 0.015,
      fog: true,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = DRAW_ORDER;
    this.group.add(points);

    const layer: ParticleLayer = {
      ...config,
      points,
      geometry,
      material,
      texture,
      positions,
      velocities,
      seeds,
      activeCount: 0,
      targetCount: 0,
      speedMultiplier: 1,
      opacityMultiplier: 1,
    };

    for (let i = 0; i < layer.maxCount; i += 1) {
      this.resetParticle(layer, i, true);
    }

    return layer;
  }

  private initializeLightningPool(): void {
    for (let i = 0; i < LIGHTNING_POOL_SIZE; i += 1) {
      const positions = new Float32Array(LIGHTNING_MAX_SEGMENTS * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setDrawRange(0, 0);

      const material = new THREE.LineBasicMaterial({
        color: 0xf5fbff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        fog: true,
      });

      const line = new THREE.Line(geometry, material);
      line.visible = false;
      line.frustumCulled = false;
      line.renderOrder = DRAW_ORDER + 2;
      this.group.add(line);

      this.bolts.push({
        line,
        geometry,
        material,
        positions,
        active: false,
        life: 0,
        maxLife: 0,
      });
    }
  }

  private updateLayerActiveCount(layer: ParticleLayer, delta: number): void {
    const step = Math.max(2, Math.floor(delta * layer.maxCount * 2.2));

    if (layer.activeCount < layer.targetCount) {
      const start = layer.activeCount;
      layer.activeCount = Math.min(layer.targetCount, layer.activeCount + step);
      for (let i = start; i < layer.activeCount; i += 1) {
        this.resetParticle(layer, i, false);
      }
    } else if (layer.activeCount > layer.targetCount) {
      layer.activeCount = Math.max(layer.targetCount, layer.activeCount - step);
    }

    layer.geometry.setDrawRange(0, layer.activeCount);
  }

  private updateLayerParticles(layer: ParticleLayer, delta: number): void {
    if (layer.activeCount <= 0) {
      return;
    }

    const windMagnitude = this.wind.length();
    const swayScale = 1 + THREE.MathUtils.clamp(windMagnitude * 0.36, 0, 1.25);
    const positionAttr = layer.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < layer.activeCount; i += 1) {
      const idx = i * 3;
      const seed = layer.seeds[i];
      const flutter = Math.sin(this.time * 2.5 + seed * 12.6) * layer.flutter;
      const gust = 0.68 + (Math.sin(this.time * 0.8 + seed * 4.8) * 0.5 + 0.5) * 0.92;
      const windX = this.wind.x * layer.windFactor * gust * swayScale;
      const windY = this.wind.y * layer.windFactor * 0.3;

      const velocityX = layer.velocities[idx] * layer.speedMultiplier;
      const velocityY = layer.velocities[idx + 1] * layer.speedMultiplier;
      const velocityZ = layer.velocities[idx + 2] * layer.speedMultiplier;

      layer.positions[idx] += (velocityX + windX + flutter * 0.28) * delta;
      layer.positions[idx + 1] += (velocityY + windY + flutter * 0.14) * delta;
      layer.positions[idx + 2] += (velocityZ + this.worldSpeed * layer.depthFactor) * delta;

      if (this.isOutOfVolume(layer, idx)) {
        this.resetParticle(layer, i, false);
      }
    }

    positionAttr.needsUpdate = true;
  }

  private isOutOfVolume(layer: ParticleLayer, idx: number): boolean {
    const x = layer.positions[idx];
    const y = layer.positions[idx + 1];
    const z = layer.positions[idx + 2];

    const marginX = 22;
    const marginY = 24;
    const marginZ = 20;

    return (
      x < VOLUME.minX - marginX ||
      x > VOLUME.maxX + marginX ||
      y < VOLUME.minY - marginY ||
      y > VOLUME.maxY + marginY ||
      z < VOLUME.minZ - marginZ ||
      z > VOLUME.maxZ + marginZ
    );
  }

  private resetParticle(layer: ParticleLayer, index: number, spreadEverywhere: boolean): void {
    const idx = index * 3;

    layer.seeds[index] = Math.random() * Math.PI * 2;

    layer.velocities[idx] = this.randomRange(layer.xSpeedRange[0], layer.xSpeedRange[1]);
    layer.velocities[idx + 1] = this.randomRange(layer.ySpeedRange[0], layer.ySpeedRange[1]);
    layer.velocities[idx + 2] = this.randomRange(layer.zSpeedRange[0], layer.zSpeedRange[1]);

    layer.positions[idx] = this.randomRange(VOLUME.minX, VOLUME.maxX);
    layer.positions[idx + 2] = this.randomRange(VOLUME.minZ, VOLUME.maxZ);

    if (spreadEverywhere || !layer.spawnFromTop) {
      layer.positions[idx + 1] = this.randomRange(VOLUME.minY, VOLUME.maxY);
      return;
    }

    const upwindBias = THREE.MathUtils.clamp(this.targetWind.x * 3.1, -17, 17);
    layer.positions[idx] = THREE.MathUtils.clamp(
      layer.positions[idx] - upwindBias,
      VOLUME.minX,
      VOLUME.maxX
    );
    layer.positions[idx + 1] = VOLUME.maxY + Math.random() * 22;
  }

  private updateLightning(delta: number): void {
    if (this.stormActive && this.lightningRate > 0) {
      const chance = delta * this.lightningRate;
      if (Math.random() < chance) {
        this.spawnLightningBolt();
      }
    }

    for (const bolt of this.bolts) {
      if (!bolt.active) {
        continue;
      }
      bolt.life = Math.max(0, bolt.life - delta);
      const alpha = bolt.life / bolt.maxLife;
      bolt.material.opacity = alpha * 0.95;
      if (bolt.life <= 0) {
        this.deactivateLightningBolt(bolt);
      }
    }
  }

  private spawnLightningBolt(): void {
    const bolt = this.acquireLightningBolt();
    if (!bolt) {
      return;
    }

    const segments = 6 + Math.floor(Math.random() * 4);

    let x = this.randomRange(-36, 36) + this.wind.x * 2.2;
    let y = VOLUME.maxY + 8 + Math.random() * 10;
    let z = this.randomRange(-120, -22);

    let writeIndex = 0;
    bolt.positions[writeIndex] = x;
    bolt.positions[writeIndex + 1] = y;
    bolt.positions[writeIndex + 2] = z;
    writeIndex += 3;

    for (let i = 1; i < segments; i += 1) {
      const horizontalScale = 1 + i / segments;
      x += this.randomRange(-5.2, 5.2) * horizontalScale + this.wind.x * 0.35;
      y -= this.randomRange(9, 17);
      z += this.randomRange(-1.8, 2.6) + this.wind.y * 0.12;
      bolt.positions[writeIndex] = x;
      bolt.positions[writeIndex + 1] = y;
      bolt.positions[writeIndex + 2] = z;
      writeIndex += 3;
    }

    const drawCount = Math.min(segments, LIGHTNING_MAX_SEGMENTS);
    if (drawCount > 0) {
      const lastPointOffset = (drawCount - 1) * 3;
      for (let i = drawCount; i < LIGHTNING_MAX_SEGMENTS; i += 1) {
        const offset = i * 3;
        bolt.positions[offset] = bolt.positions[lastPointOffset];
        bolt.positions[offset + 1] = bolt.positions[lastPointOffset + 1];
        bolt.positions[offset + 2] = bolt.positions[lastPointOffset + 2];
      }
    }

    const positionAttr = bolt.geometry.attributes.position as THREE.BufferAttribute;
    positionAttr.needsUpdate = true;
    bolt.geometry.setDrawRange(0, drawCount);
    bolt.material.opacity = 0.95;
    bolt.line.visible = true;
    bolt.active = true;

    const maxLife = 0.08 + Math.random() * 0.14;
    bolt.life = maxLife;
    bolt.maxLife = maxLife;
  }

  private acquireLightningBolt(): LightningBolt | null {
    for (const bolt of this.bolts) {
      if (!bolt.active) {
        return bolt;
      }
    }

    let weakestActiveBolt: LightningBolt | null = null;
    let smallestLife = Number.POSITIVE_INFINITY;
    for (const bolt of this.bolts) {
      if (!bolt.active) {
        return bolt;
      }
      if (bolt.life < smallestLife) {
        smallestLife = bolt.life;
        weakestActiveBolt = bolt;
      }
    }
    return weakestActiveBolt;
  }

  private deactivateLightningBolt(bolt: LightningBolt): void {
    bolt.active = false;
    bolt.life = 0;
    bolt.maxLife = 0;
    bolt.line.visible = false;
    bolt.material.opacity = 0;
    bolt.geometry.setDrawRange(0, 0);
  }

  private clampCount(value: number, maxCount: number): number {
    return Math.round(THREE.MathUtils.clamp(value, 0, maxCount));
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private applyPalette(isDay: boolean): void {
    for (const layer of this.layers) {
      layer.material.color.set(isDay ? layer.dayColor : layer.nightColor);
    }
  }

  private applyLayerOpacities(): void {
    for (const layer of this.layers) {
      layer.material.opacity = layer.baseOpacity * layer.opacityMultiplier;
      layer.material.needsUpdate = true;
    }
  }

  private getRecipeForWeather(state: WeatherParticleState): ParticleRecipe {
    switch (state.weatherCode) {
      case 0:
        return this.recipe(0, 0, 0, 0, 180, 1, 1, 1, 0.82, 0.95, 0, 0, 0, 0, 1.12, 0);
      case 1:
        return this.recipe(0, 0, 0, 80, 150, 1, 1, 1, 0.88, 0.95, 0, 0, 0, 0.3, 1, 0);
      case 2:
        return this.recipe(0, 0, 0, 170, 120, 1, 1, 1, 0.95, 1, 0, 0, 0, 0.4, 0.92, 0);
      case 3:
        return this.recipe(0, 0, 0, 290, 85, 1, 1, 1, 1.02, 0.95, 0, 0, 0, 0.5, 0.82, 0);
      case 45:
        return this.recipe(0, 0, 0, 680, 50, 1, 1, 1, 1.05, 0.9, 0, 0, 0, 0.88, 0.7, 0);
      case 48:
        return this.recipe(0, 0, 0, 900, 34, 1, 1, 1, 1.12, 0.85, 0, 0, 0, 1, 0.62, 0);
      case 51:
        return this.recipe(520, 0, 0, 250, 20, 0.95, 1, 1, 0.96, 0.8, 0.88, 0, 0, 0.52, 0.3, 0);
      case 53:
        return this.recipe(720, 0, 0, 300, 14, 1, 1, 1, 1, 0.75, 0.98, 0, 0, 0.58, 0.24, 0);
      case 55:
        return this.recipe(980, 0, 0, 350, 8, 1.08, 1, 1, 1.05, 0.7, 1.08, 0, 0, 0.64, 0.18, 0);
      case 56:
        return this.recipe(430, 260, 95, 330, 12, 1.02, 1, 1.05, 1.02, 0.72, 0.9, 0.8, 0.78, 0.62, 0.22, 0.2);
      case 57:
        return this.recipe(650, 360, 160, 370, 8, 1.12, 1.08, 1.12, 1.08, 0.66, 1.02, 0.9, 0.9, 0.68, 0.16, 0.24);
      case 61:
        return this.recipe(700, 0, 0, 280, 14, 1, 1, 1, 1, 0.8, 0.92, 0, 0, 0.55, 0.24, 0);
      case 63:
        return this.recipe(980, 0, 0, 330, 10, 1.08, 1, 1, 1.06, 0.75, 1.02, 0, 0, 0.62, 0.2, 0);
      case 65:
        return this.recipe(1400, 0, 0, 410, 5, 1.18, 1, 1, 1.12, 0.68, 1.2, 0, 0, 0.74, 0.12, 0);
      case 66:
        return this.recipe(560, 330, 140, 360, 8, 1.1, 1.08, 1.1, 1.06, 0.72, 0.96, 0.9, 0.86, 0.68, 0.16, 0.22);
      case 67:
        return this.recipe(900, 500, 240, 430, 5, 1.2, 1.14, 1.2, 1.12, 0.66, 1.14, 1.02, 1.02, 0.78, 0.1, 0.32);
      case 71:
        return this.recipe(0, 540, 0, 230, 12, 1, 0.95, 1, 0.95, 0.82, 0, 0.92, 0, 0.56, 0.22, 0);
      case 73:
        return this.recipe(0, 760, 0, 280, 10, 1, 1, 1, 1, 0.78, 0, 0.98, 0, 0.62, 0.18, 0);
      case 75:
        return this.recipe(0, 1200, 0, 340, 6, 1, 1.14, 1, 1.05, 0.72, 0, 1.08, 0, 0.74, 0.12, 0);
      case 77:
        return this.recipe(0, 680, 0, 300, 8, 1, 1.05, 1, 1, 0.72, 0, 0.94, 0, 0.68, 0.14, 0);
      case 80:
        return this.recipe(760, 0, 0, 280, 15, 1.04, 1, 1, 1.02, 0.76, 0.94, 0, 0, 0.56, 0.24, 0);
      case 81:
        return this.recipe(1020, 0, 0, 340, 10, 1.12, 1, 1, 1.08, 0.72, 1.04, 0, 0, 0.64, 0.2, 0);
      case 82:
        return this.recipe(1520, 0, 0, 450, 4, 1.24, 1, 1, 1.15, 0.62, 1.24, 0, 0, 0.78, 0.12, 0);
      case 85:
        return this.recipe(0, 620, 0, 250, 11, 1, 1, 1, 0.98, 0.78, 0, 0.94, 0, 0.6, 0.2, 0);
      case 86:
        return this.recipe(0, 980, 0, 320, 7, 1, 1.12, 1, 1.06, 0.72, 0, 1.05, 0, 0.72, 0.14, 0);
      case 95:
        return this.recipe(1560, 0, 320, 420, 0, 1.28, 1, 1.25, 1.16, 0, 1.26, 0, 1.08, 0.82, 0, 1.4);
      case 96:
        return this.recipe(1640, 0, 420, 460, 0, 1.32, 1, 1.3, 1.18, 0, 1.32, 0, 1.18, 0.86, 0, 1.7);
      case 99:
        return this.recipe(1720, 0, 520, 500, 0, 1.36, 1, 1.34, 1.22, 0, 1.38, 0, 1.28, 0.92, 0, 2.1);
      default:
        return this.getConditionFallbackRecipe(state.condition);
    }
  }

  private getConditionFallbackRecipe(condition: OpenMeteoWeatherCondition): ParticleRecipe {
    switch (condition) {
      case 'clear':
        return this.recipe(0, 0, 0, 40, 170, 1, 1, 1, 0.85, 0.95, 0, 0, 0, 0.25, 1.05, 0);
      case 'cloudy':
        return this.recipe(0, 0, 0, 260, 95, 1, 1, 1, 1, 0.9, 0, 0, 0, 0.52, 0.85, 0);
      case 'fog':
        return this.recipe(0, 0, 0, 760, 40, 1, 1, 1, 1.08, 0.85, 0, 0, 0, 0.95, 0.65, 0);
      case 'rain':
        return this.recipe(980, 0, 0, 330, 10, 1.1, 1, 1, 1.07, 0.72, 1.04, 0, 0, 0.64, 0.2, 0);
      case 'snow':
        return this.recipe(0, 780, 0, 300, 9, 1, 1.05, 1, 1.02, 0.75, 0, 0.98, 0, 0.64, 0.18, 0);
      case 'mixed':
        return this.recipe(820, 440, 220, 400, 5, 1.16, 1.1, 1.2, 1.1, 0.68, 1.1, 0.98, 0.98, 0.75, 0.14, 0.48);
      case 'storm':
        return this.recipe(1650, 0, 440, 480, 0, 1.32, 1, 1.3, 1.18, 0, 1.34, 0, 1.2, 0.88, 0, 1.8);
      default:
        return this.recipe(0, 0, 0, 220, 90, 1, 1, 1, 1, 0.9, 0, 0, 0, 0.48, 0.82, 0);
    }
  }

  private recipe(
    rain: number,
    snow: number,
    hail: number,
    mist: number,
    motes: number,
    rainSpeed: number,
    snowSpeed: number,
    hailSpeed: number,
    mistSpeed: number,
    motesSpeed: number,
    rainOpacity: number,
    snowOpacity: number,
    hailOpacity: number,
    mistOpacity: number,
    motesOpacity: number,
    lightningRate: number
  ): ParticleRecipe {
    return {
      rain,
      snow,
      hail,
      mist,
      motes,
      rainSpeed,
      snowSpeed,
      hailSpeed,
      mistSpeed,
      motesSpeed,
      rainOpacity,
      snowOpacity,
      hailOpacity,
      mistOpacity,
      motesOpacity,
      lightningRate,
    };
  }

  private createParticleTexture(kind: LayerKind): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, 64, 64);

      if (kind === 'rain') {
        const gradient = ctx.createLinearGradient(32, 4, 32, 60);
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.7)');
        gradient.addColorStop(0.8, 'rgba(255,255,255,1)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(28, 4, 8, 56);
      } else if (kind === 'snow') {
        const gradient = ctx.createRadialGradient(32, 32, 3, 32, 32, 26);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.35, 'rgba(255,255,255,0.95)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(32, 32, 26, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'hail') {
        const gradient = ctx.createRadialGradient(30, 30, 2, 32, 32, 20);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.45, 'rgba(225,242,255,0.95)');
        gradient.addColorStop(1, 'rgba(225,242,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(32, 32, 20, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'mist') {
        const gradient = ctx.createRadialGradient(32, 32, 8, 32, 32, 30);
        gradient.addColorStop(0, 'rgba(255,255,255,0.7)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(32, 32, 30, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 14);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(32, 32, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }
}
