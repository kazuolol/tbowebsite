import * as THREE from 'three';
import { CharacterPool } from '../environment/CharacterPool';
import {
  LOCAL_WEATHER_UPDATE_EVENT,
  classifyOpenMeteoWeatherCode,
  type LocalWeatherSnapshot,
  type OpenMeteoWeatherCondition,
} from '../utils/LocalWeather';

interface FloatingCube {
  mesh: THREE.Mesh;
  rotationSpeed: THREE.Vector3;
  baseOpacity: number;
  baseEmissiveIntensity: number;
}

interface CubeFragment {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
  baseOpacity: number;
  baseEmissiveIntensity: number;
}

interface WeatherSceneProfile {
  backgroundColor: THREE.ColorRepresentation;
  fogColor: THREE.ColorRepresentation;
  cubeColor: THREE.ColorRepresentation;
  cubeEmissiveColor: THREE.ColorRepresentation;
  fogDensity: number;
  worldSpeed: number;
  driftX: number;
  driftY: number;
  fragmentSpawnChance: number;
  maxFragments: number;
  cubeOpacityMultiplier: number;
  cubeEmissiveMultiplier: number;
  ambientIntensity: number;
  keyIntensity: number;
  fillIntensity: number;
  glowOpacity: number;
  storm: boolean;
}

const CUBE_COUNT = 150;
const RECYCLE_Z = 25;
const RESET_Z = -500;
const XY_SPREAD = 35;
const CHARACTER_SCALE = 0.034;

const DEFAULT_WORLD_SPEED = 12;
const DEFAULT_FOG_DENSITY = 0.005;
const DEFAULT_FRAGMENT_SPAWN_CHANCE = 0.02;
const DEFAULT_MAX_FRAGMENTS = 80;

export class FallingScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private canvas: HTMLCanvasElement;

  private characterPool: CharacterPool;
  private cubeMaterial: THREE.MeshStandardMaterial;

  private ambientLight: THREE.AmbientLight;
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;

  private cubes: FloatingCube[] = [];
  private fragments: CubeFragment[] = [];

  private worldSpeed = DEFAULT_WORLD_SPEED;
  private targetWorldSpeed = DEFAULT_WORLD_SPEED;
  private fragmentSpawnChance = DEFAULT_FRAGMENT_SPAWN_CHANCE;
  private targetFragmentSpawnChance = DEFAULT_FRAGMENT_SPAWN_CHANCE;
  private maxFragments = DEFAULT_MAX_FRAGMENTS;
  private targetMaxFragments = DEFAULT_MAX_FRAGMENTS;

  private cubeOpacityMultiplier = 1;
  private targetCubeOpacityMultiplier = 1;
  private cubeEmissiveMultiplier = 1;
  private targetCubeEmissiveMultiplier = 1;

  private cubeDrift = new THREE.Vector2();
  private targetCubeDrift = new THREE.Vector2();

  private targetFogDensity = DEFAULT_FOG_DENSITY;
  private targetAmbientIntensity = 0.6;
  private targetKeyIntensity = 1.0;
  private targetFillIntensity = 0.4;
  private targetGlowOpacity = 0.35;

  private readonly targetFogColor = new THREE.Color(0xcccccc);
  private readonly targetBackgroundColor = new THREE.Color(0xcccccc);
  private readonly targetCubeColor = new THREE.Color(0xddeeff);
  private readonly targetCubeEmissiveColor = new THREE.Color(0xddeeff);

  private stormMode = false;
  private stormFlashTimeLeft = 0;
  private stormFlashDuration = 0.12;
  private stormFlashStrength = 0;

  private animationFrameId: number | null = null;
  private disposed = false;
  private glowTexture: THREE.CanvasTexture | null = null;
  private glowMaterial: THREE.SpriteMaterial | null = null;
  private glowSprite: THREE.Sprite | null = null;
  private viewportWidth = 0;
  private viewportHeight = 0;

  private readonly onResizeHandler = (): void => {
    this.onResize();
  };

  private readonly animateFrame = (): void => {
    this.animate();
  };

  private readonly onWeatherUpdateHandler = (event: Event): void => {
    const customEvent = event as CustomEvent<LocalWeatherSnapshot>;
    if (!customEvent.detail) {
      return;
    }
    this.applyWeatherSnapshot(customEvent.detail);
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcccccc);
    this.scene.fog = new THREE.FogExp2(0xcccccc, DEFAULT_FOG_DENSITY);
    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      600
    );
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 0, -50);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.localClippingEnabled = true;
    this.onResize();

    this.cubeMaterial = new THREE.MeshStandardMaterial({
      color: 0xddeeff,
      emissive: 0xddeeff,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9,
    });

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.keyLight.position.set(5, 10, 7);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    this.fillLight.position.set(-5, 5, -5);
    this.scene.add(this.fillLight);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const ctx = glowCanvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }

    this.glowTexture = new THREE.CanvasTexture(glowCanvas);
    this.glowMaterial = new THREE.SpriteMaterial({
      map: this.glowTexture,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.glowMaterial.opacity = this.targetGlowOpacity;
    this.glowSprite = new THREE.Sprite(this.glowMaterial);
    this.glowSprite.position.set(0, 3, -40);
    this.glowSprite.scale.set(60, 60, 1);
    this.glowSprite.renderOrder = -1;
    this.scene.add(this.glowSprite);

    this.characterPool = new CharacterPool(this.scene);
    void this.loadCharacter();

    this.createInitialCubes();

    window.addEventListener('resize', this.onResizeHandler);
    window.addEventListener(
      LOCAL_WEATHER_UPDATE_EVENT,
      this.onWeatherUpdateHandler as EventListener
    );

    this.applyWeatherSnapshot({
      temperatureF: 68,
      weatherCode: 2,
      isDay: this.isLocalDaytime(),
    });

    this.animate();
  }

  private async loadCharacter(): Promise<void> {
    try {
      await this.characterPool.preload(
        '/models/YoughFemale_Rig.fbx',
        '/models/YoughFemale_Jump_Loop.fbx',
        '/models/YoughMale_Rig.fbx',
        '/models/YoughMale_Jump_Loop.fbx',
        CHARACTER_SCALE
      );
    } catch (error) {
      console.error('Failed to load character pool:', error);
    }
  }

  private randomCubeSize(): number {
    const random = Math.random();
    if (random < 0.5) {
      return 0.3 + Math.random() * 2;
    }
    if (random < 0.85) {
      return 2 + Math.random() * 6;
    }
    return 8 + Math.random() * 20;
  }

  private createCubeMaterial(): THREE.MeshStandardMaterial {
    return this.cubeMaterial.clone();
  }

  private applyRandomCubeMaterialValues(material: THREE.MeshStandardMaterial): {
    opacity: number;
    emissiveIntensity: number;
  } {
    const opacity = 0.7 + Math.random() * 0.3;
    const emissiveIntensity = 0.8 + Math.random() * 0.6;

    material.color.copy(this.cubeMaterial.color);
    material.emissive.copy(this.cubeMaterial.emissive);
    material.opacity = opacity * this.cubeOpacityMultiplier;
    material.emissiveIntensity = emissiveIntensity * this.cubeEmissiveMultiplier;

    return { opacity, emissiveIntensity };
  }

  private spawnCube(z: number): void {
    const cubeSize = this.randomCubeSize();
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = this.createCubeMaterial();
    const values = this.applyRandomCubeMaterialValues(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (Math.random() - 0.5) * XY_SPREAD * 2,
      (Math.random() - 0.5) * XY_SPREAD * 2,
      z
    );
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    this.scene.add(mesh);

    const speedScale = Math.max(0.05, 1 - cubeSize / 30);
    this.cubes.push({
      mesh,
      baseOpacity: values.opacity,
      baseEmissiveIntensity: values.emissiveIntensity,
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.6 * speedScale,
        (Math.random() - 0.5) * 0.6 * speedScale,
        (Math.random() - 0.5) * 0.3 * speedScale
      ),
    });
  }

  private createInitialCubes(): void {
    for (let i = 0; i < CUBE_COUNT; i += 1) {
      const z = -10 - i * (Math.abs(RESET_Z) / CUBE_COUNT);
      this.spawnCube(z);
    }
  }

  private spawnFragment(sourcePosition: THREE.Vector3): void {
    if (this.fragments.length >= this.maxFragments) {
      return;
    }

    const shardSize = 0.2 + Math.random() * 1.5;
    const geometry = new THREE.BoxGeometry(shardSize, shardSize, shardSize);
    const material = this.createCubeMaterial();
    const values = this.applyRandomCubeMaterialValues(material);
    values.opacity *= 0.5;
    material.opacity = values.opacity * this.cubeOpacityMultiplier;
    material.emissiveIntensity = values.emissiveIntensity * this.cubeEmissiveMultiplier;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(sourcePosition);
    mesh.position.x += (Math.random() - 0.5) * 10;
    mesh.position.y += (Math.random() - 0.5) * 10;

    this.scene.add(mesh);

    this.fragments.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        this.worldSpeed * 0.5 + Math.random() * 3
      ),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      life: 0,
      maxLife: 2 + Math.random() * 2,
      baseOpacity: values.opacity,
      baseEmissiveIntensity: values.emissiveIntensity,
    });
  }

  private onResize(): void {
    if (this.disposed) {
      return;
    }

    const width = Math.max(1, Math.floor(this.canvas.clientWidth || window.innerWidth));
    const height = Math.max(1, Math.floor(this.canvas.clientHeight || window.innerHeight));
    if (width === this.viewportWidth && height === this.viewportHeight) {
      return;
    }

    this.viewportWidth = width;
    this.viewportHeight = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private animate(): void {
    if (this.disposed) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.animateFrame);
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.camera.fov = 75 + Math.sin(elapsed * 0.15) * 2;
    this.camera.updateProjectionMatrix();

    this.updateWeatherTransition(delta);
    this.characterPool.update(delta);
    this.updateCubes(delta);
    this.updateFragments(delta);

    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 0, -50);
    this.onResize();

    this.renderer.render(this.scene, this.camera);
  }

  private updateWeatherTransition(delta: number): void {
    const blend = 1 - Math.exp(-delta * 2.2);

    this.worldSpeed = THREE.MathUtils.lerp(this.worldSpeed, this.targetWorldSpeed, blend);
    this.fragmentSpawnChance = THREE.MathUtils.lerp(
      this.fragmentSpawnChance,
      this.targetFragmentSpawnChance,
      blend
    );
    this.maxFragments = Math.round(
      THREE.MathUtils.lerp(this.maxFragments, this.targetMaxFragments, blend)
    );
    this.cubeOpacityMultiplier = THREE.MathUtils.lerp(
      this.cubeOpacityMultiplier,
      this.targetCubeOpacityMultiplier,
      blend
    );
    this.cubeEmissiveMultiplier = THREE.MathUtils.lerp(
      this.cubeEmissiveMultiplier,
      this.targetCubeEmissiveMultiplier,
      blend
    );
    this.cubeDrift.lerp(this.targetCubeDrift, blend);

    this.cubeMaterial.color.lerp(this.targetCubeColor, blend);
    this.cubeMaterial.emissive.lerp(this.targetCubeEmissiveColor, blend);

    const fog = this.scene.fog;
    if (fog instanceof THREE.FogExp2) {
      fog.color.lerp(this.targetFogColor, blend);
      fog.density = THREE.MathUtils.lerp(fog.density, this.targetFogDensity, blend);
    }

    const background = this.scene.background;
    if (background instanceof THREE.Color) {
      background.lerp(this.targetBackgroundColor, blend);
    }

    this.ambientLight.intensity = THREE.MathUtils.lerp(
      this.ambientLight.intensity,
      this.targetAmbientIntensity,
      blend
    );
    this.keyLight.intensity = THREE.MathUtils.lerp(
      this.keyLight.intensity,
      this.targetKeyIntensity,
      blend
    );
    this.fillLight.intensity = THREE.MathUtils.lerp(
      this.fillLight.intensity,
      this.targetFillIntensity,
      blend
    );

    if (this.glowMaterial) {
      this.glowMaterial.opacity = THREE.MathUtils.lerp(
        this.glowMaterial.opacity,
        this.targetGlowOpacity,
        blend
      );
    }

    this.applyStormFlash(delta);
  }

  private applyStormFlash(delta: number): void {
    if (!this.stormMode) {
      this.stormFlashTimeLeft = 0;
      return;
    }

    if (this.stormFlashTimeLeft <= 0 && Math.random() < delta * 0.6) {
      this.stormFlashDuration = 0.08 + Math.random() * 0.16;
      this.stormFlashTimeLeft = this.stormFlashDuration;
      this.stormFlashStrength = 0.6 + Math.random() * 1.2;
    }

    if (this.stormFlashTimeLeft > 0) {
      this.stormFlashTimeLeft = Math.max(0, this.stormFlashTimeLeft - delta);
      const progress = 1 - this.stormFlashTimeLeft / this.stormFlashDuration;
      const pulse = Math.sin(progress * Math.PI);
      const flashAmount = pulse * this.stormFlashStrength;

      this.ambientLight.intensity += flashAmount * 0.45;
      this.keyLight.intensity += flashAmount * 1.6;
      this.fillLight.intensity += flashAmount * 0.5;

      if (this.glowMaterial) {
        this.glowMaterial.opacity = Math.min(1, this.glowMaterial.opacity + flashAmount * 0.25);
      }
    }
  }

  private updateCubes(delta: number): void {
    const moveAmount = this.worldSpeed * delta;
    const horizontalBounds = XY_SPREAD * 2.4;

    for (const cube of this.cubes) {
      cube.mesh.position.z += moveAmount;
      cube.mesh.position.x += this.cubeDrift.x * delta;
      cube.mesh.position.y += this.cubeDrift.y * delta;

      cube.mesh.rotation.x += cube.rotationSpeed.x * delta;
      cube.mesh.rotation.y += cube.rotationSpeed.y * delta;
      cube.mesh.rotation.z += cube.rotationSpeed.z * delta;

      const material = cube.mesh.material as THREE.MeshStandardMaterial;
      material.color.copy(this.cubeMaterial.color);
      material.emissive.copy(this.cubeMaterial.emissive);
      material.opacity = cube.baseOpacity * this.cubeOpacityMultiplier;
      material.emissiveIntensity =
        cube.baseEmissiveIntensity * this.cubeEmissiveMultiplier;

      if (cube.mesh.position.x > horizontalBounds) {
        cube.mesh.position.x = -horizontalBounds;
      } else if (cube.mesh.position.x < -horizontalBounds) {
        cube.mesh.position.x = horizontalBounds;
      }

      if (cube.mesh.position.y > horizontalBounds) {
        cube.mesh.position.y = -horizontalBounds;
      } else if (cube.mesh.position.y < -horizontalBounds) {
        cube.mesh.position.y = horizontalBounds;
      }

      if (
        cube.mesh.position.z > -5 &&
        cube.mesh.position.z < 15 &&
        Math.random() < this.fragmentSpawnChance
      ) {
        this.spawnFragment(cube.mesh.position.clone());
      }

      if (cube.mesh.position.z > RECYCLE_Z) {
        cube.mesh.geometry.dispose();

        const cubeSize = this.randomCubeSize();
        cube.mesh.geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

        const refreshed = this.applyRandomCubeMaterialValues(material);
        cube.baseOpacity = refreshed.opacity;
        cube.baseEmissiveIntensity = refreshed.emissiveIntensity;

        cube.mesh.position.set(
          (Math.random() - 0.5) * XY_SPREAD * 2,
          (Math.random() - 0.5) * XY_SPREAD * 2,
          -100 - Math.random() * (Math.abs(RESET_Z) - 100)
        );
        cube.mesh.rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        );

        const speedScale = Math.max(0.05, 1 - cubeSize / 30);
        cube.rotationSpeed.set(
          (Math.random() - 0.5) * 0.6 * speedScale,
          (Math.random() - 0.5) * 0.6 * speedScale,
          (Math.random() - 0.5) * 0.3 * speedScale
        );
      }
    }
  }

  private updateFragments(delta: number): void {
    for (let i = this.fragments.length - 1; i >= 0; i -= 1) {
      const fragment = this.fragments[i];

      fragment.mesh.position.add(fragment.velocity.clone().multiplyScalar(delta));
      fragment.mesh.position.x += this.cubeDrift.x * delta * 0.65;
      fragment.mesh.position.y += this.cubeDrift.y * delta * 0.65;

      fragment.mesh.rotation.x += fragment.rotationSpeed.x * delta;
      fragment.mesh.rotation.y += fragment.rotationSpeed.y * delta;
      fragment.mesh.rotation.z += fragment.rotationSpeed.z * delta;

      fragment.life += delta;
      const lifeRatio = fragment.life / fragment.maxLife;

      const material = fragment.mesh.material as THREE.MeshStandardMaterial;
      material.color.copy(this.cubeMaterial.color);
      material.emissive.copy(this.cubeMaterial.emissive);
      material.emissiveIntensity =
        fragment.baseEmissiveIntensity * this.cubeEmissiveMultiplier;

      const lifeOpacity = this.getFragmentLifeOpacity(lifeRatio);
      material.opacity =
        fragment.baseOpacity * this.cubeOpacityMultiplier * lifeOpacity;

      if (fragment.life > fragment.maxLife || fragment.mesh.position.z > 50) {
        this.scene.remove(fragment.mesh);
        fragment.mesh.geometry.dispose();
        (fragment.mesh.material as THREE.Material).dispose();
        this.fragments.splice(i, 1);
      }
    }
  }

  private getFragmentLifeOpacity(lifeRatio: number): number {
    if (lifeRatio < 0.1) {
      return lifeRatio / 0.1;
    }
    if (lifeRatio > 0.5) {
      return Math.max(0, 1 - (lifeRatio - 0.5) / 0.5);
    }
    return 1;
  }

  private applyWeatherSnapshot(snapshot: LocalWeatherSnapshot): void {
    const profile = this.createWeatherProfile(snapshot);

    this.targetWorldSpeed = THREE.MathUtils.clamp(profile.worldSpeed, 6, 24);
    this.targetFogDensity = THREE.MathUtils.clamp(profile.fogDensity, 0.002, 0.013);
    this.targetCubeDrift.set(profile.driftX, profile.driftY);
    this.targetFragmentSpawnChance = THREE.MathUtils.clamp(
      profile.fragmentSpawnChance,
      0.006,
      0.06
    );
    this.targetMaxFragments = Math.round(
      THREE.MathUtils.clamp(profile.maxFragments, 30, 160)
    );

    this.targetCubeOpacityMultiplier = THREE.MathUtils.clamp(
      profile.cubeOpacityMultiplier,
      0.55,
      1.35
    );
    this.targetCubeEmissiveMultiplier = THREE.MathUtils.clamp(
      profile.cubeEmissiveMultiplier,
      0.55,
      1.6
    );

    this.targetAmbientIntensity = THREE.MathUtils.clamp(profile.ambientIntensity, 0.2, 1.2);
    this.targetKeyIntensity = THREE.MathUtils.clamp(profile.keyIntensity, 0.2, 1.8);
    this.targetFillIntensity = THREE.MathUtils.clamp(profile.fillIntensity, 0.1, 1.2);
    this.targetGlowOpacity = THREE.MathUtils.clamp(profile.glowOpacity, 0.08, 0.7);

    this.targetBackgroundColor.set(profile.backgroundColor);
    this.targetFogColor.set(profile.fogColor);
    this.targetCubeColor.set(profile.cubeColor);
    this.targetCubeEmissiveColor.set(profile.cubeEmissiveColor);

    this.stormMode = profile.storm;
  }

  private createWeatherProfile(snapshot: LocalWeatherSnapshot): WeatherSceneProfile {
    const condition = classifyOpenMeteoWeatherCode(snapshot.weatherCode);
    let profile = this.getConditionProfile(condition);

    if (!snapshot.isDay) {
      profile = this.toNightProfile(profile);
    }

    const temperatureBlend = THREE.MathUtils.clamp((snapshot.temperatureF - 20) / 80, 0, 1);
    const coolTint = new THREE.Color(0x94d0ff);
    const warmTint = new THREE.Color(0xffc187);
    const temperatureTint = coolTint.lerp(warmTint, temperatureBlend);

    const cubeColor = new THREE.Color(profile.cubeColor);
    const cubeEmissiveColor = new THREE.Color(profile.cubeEmissiveColor);
    cubeColor.lerp(temperatureTint, snapshot.isDay ? 0.24 : 0.12);
    cubeEmissiveColor.lerp(temperatureTint, snapshot.isDay ? 0.3 : 0.16);

    profile = {
      ...profile,
      cubeColor: cubeColor.getHex(),
      cubeEmissiveColor: cubeEmissiveColor.getHex(),
    };

    if (snapshot.temperatureF <= 28) {
      profile.worldSpeed *= 0.9;
      profile.cubeEmissiveMultiplier *= 1.1;
    } else if (snapshot.temperatureF >= 90) {
      profile.worldSpeed *= 1.1;
      profile.cubeOpacityMultiplier *= 0.92;
    }

    return profile;
  }

  private getConditionProfile(condition: OpenMeteoWeatherCondition): WeatherSceneProfile {
    switch (condition) {
      case 'clear':
        return {
          backgroundColor: 0xd8e7f5,
          fogColor: 0xdeebf8,
          cubeColor: 0xddeeff,
          cubeEmissiveColor: 0xc4eaff,
          fogDensity: 0.0038,
          worldSpeed: 10.5,
          driftX: 0,
          driftY: 0,
          fragmentSpawnChance: 0.014,
          maxFragments: 60,
          cubeOpacityMultiplier: 1,
          cubeEmissiveMultiplier: 1.1,
          ambientIntensity: 0.72,
          keyIntensity: 1.18,
          fillIntensity: 0.58,
          glowOpacity: 0.38,
          storm: false,
        };
      case 'cloudy':
        return {
          backgroundColor: 0xb8c6d4,
          fogColor: 0xb5c2d0,
          cubeColor: 0xc3d8ef,
          cubeEmissiveColor: 0x9dc4e6,
          fogDensity: 0.0064,
          worldSpeed: 11.5,
          driftX: 0.25,
          driftY: -0.05,
          fragmentSpawnChance: 0.02,
          maxFragments: 78,
          cubeOpacityMultiplier: 0.96,
          cubeEmissiveMultiplier: 0.95,
          ambientIntensity: 0.56,
          keyIntensity: 0.96,
          fillIntensity: 0.43,
          glowOpacity: 0.28,
          storm: false,
        };
      case 'fog':
        return {
          backgroundColor: 0xc2c9d2,
          fogColor: 0xcad0da,
          cubeColor: 0xb8c3cf,
          cubeEmissiveColor: 0x8ea4bd,
          fogDensity: 0.0105,
          worldSpeed: 8.5,
          driftX: 0.08,
          driftY: 0.02,
          fragmentSpawnChance: 0.01,
          maxFragments: 42,
          cubeOpacityMultiplier: 0.84,
          cubeEmissiveMultiplier: 0.7,
          ambientIntensity: 0.63,
          keyIntensity: 0.7,
          fillIntensity: 0.36,
          glowOpacity: 0.18,
          storm: false,
        };
      case 'rain':
        return {
          backgroundColor: 0x778596,
          fogColor: 0x8391a5,
          cubeColor: 0xa6bfda,
          cubeEmissiveColor: 0x7ba8cf,
          fogDensity: 0.0085,
          worldSpeed: 14.5,
          driftX: 1.2,
          driftY: -0.3,
          fragmentSpawnChance: 0.032,
          maxFragments: 105,
          cubeOpacityMultiplier: 0.78,
          cubeEmissiveMultiplier: 0.82,
          ambientIntensity: 0.45,
          keyIntensity: 0.84,
          fillIntensity: 0.3,
          glowOpacity: 0.22,
          storm: false,
        };
      case 'snow':
        return {
          backgroundColor: 0xcfd9e6,
          fogColor: 0xd8e2f0,
          cubeColor: 0xdae8f8,
          cubeEmissiveColor: 0xb8ddff,
          fogDensity: 0.009,
          worldSpeed: 9.2,
          driftX: 0.55,
          driftY: -0.08,
          fragmentSpawnChance: 0.016,
          maxFragments: 68,
          cubeOpacityMultiplier: 0.9,
          cubeEmissiveMultiplier: 1.18,
          ambientIntensity: 0.68,
          keyIntensity: 1.0,
          fillIntensity: 0.5,
          glowOpacity: 0.3,
          storm: false,
        };
      case 'mixed':
        return {
          backgroundColor: 0x97a6b7,
          fogColor: 0xa5b2c2,
          cubeColor: 0xbfd2e6,
          cubeEmissiveColor: 0x95bedf,
          fogDensity: 0.0096,
          worldSpeed: 12.6,
          driftX: 0.9,
          driftY: -0.18,
          fragmentSpawnChance: 0.025,
          maxFragments: 92,
          cubeOpacityMultiplier: 0.86,
          cubeEmissiveMultiplier: 0.95,
          ambientIntensity: 0.52,
          keyIntensity: 0.9,
          fillIntensity: 0.35,
          glowOpacity: 0.24,
          storm: false,
        };
      case 'storm':
        return {
          backgroundColor: 0x5d6879,
          fogColor: 0x687386,
          cubeColor: 0x98b1cc,
          cubeEmissiveColor: 0x6f9bc4,
          fogDensity: 0.011,
          worldSpeed: 18.5,
          driftX: 2.1,
          driftY: -0.45,
          fragmentSpawnChance: 0.045,
          maxFragments: 130,
          cubeOpacityMultiplier: 0.68,
          cubeEmissiveMultiplier: 0.72,
          ambientIntensity: 0.35,
          keyIntensity: 0.68,
          fillIntensity: 0.24,
          glowOpacity: 0.18,
          storm: true,
        };
      default:
        return {
          backgroundColor: 0xb8c6d4,
          fogColor: 0xb5c2d0,
          cubeColor: 0xc3d8ef,
          cubeEmissiveColor: 0x9dc4e6,
          fogDensity: 0.0064,
          worldSpeed: 11.5,
          driftX: 0.25,
          driftY: -0.05,
          fragmentSpawnChance: 0.02,
          maxFragments: 78,
          cubeOpacityMultiplier: 0.96,
          cubeEmissiveMultiplier: 0.95,
          ambientIntensity: 0.56,
          keyIntensity: 0.96,
          fillIntensity: 0.43,
          glowOpacity: 0.28,
          storm: false,
        };
    }
  }

  private toNightProfile(dayProfile: WeatherSceneProfile): WeatherSceneProfile {
    const background = new THREE.Color(dayProfile.backgroundColor).multiplyScalar(0.3);
    const fog = new THREE.Color(dayProfile.fogColor).multiplyScalar(0.36);
    const cube = new THREE.Color(dayProfile.cubeColor).multiplyScalar(0.68);
    const emissive = new THREE.Color(dayProfile.cubeEmissiveColor).multiplyScalar(0.8);

    return {
      ...dayProfile,
      backgroundColor: background.getHex(),
      fogColor: fog.getHex(),
      cubeColor: cube.getHex(),
      cubeEmissiveColor: emissive.getHex(),
      fogDensity: dayProfile.fogDensity * 0.92,
      worldSpeed: dayProfile.worldSpeed * 0.95,
      ambientIntensity: dayProfile.ambientIntensity * 0.58,
      keyIntensity: dayProfile.keyIntensity * 0.68,
      fillIntensity: dayProfile.fillIntensity * 0.62,
      glowOpacity: dayProfile.glowOpacity * 0.75,
    };
  }

  private isLocalDaytime(): boolean {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.onResizeHandler);
    window.removeEventListener(
      LOCAL_WEATHER_UPDATE_EVENT,
      this.onWeatherUpdateHandler as EventListener
    );

    this.characterPool.dispose();

    for (const cube of this.cubes) {
      this.scene.remove(cube.mesh);
      cube.mesh.geometry.dispose();
      (cube.mesh.material as THREE.Material).dispose();
    }
    this.cubes = [];

    for (const fragment of this.fragments) {
      this.scene.remove(fragment.mesh);
      fragment.mesh.geometry.dispose();
      (fragment.mesh.material as THREE.Material).dispose();
    }
    this.fragments = [];

    if (this.glowSprite) {
      this.scene.remove(this.glowSprite);
      this.glowSprite = null;
    }
    if (this.glowMaterial) {
      this.glowMaterial.dispose();
      this.glowMaterial = null;
    }
    if (this.glowTexture) {
      this.glowTexture.dispose();
      this.glowTexture = null;
    }

    this.cubeMaterial.dispose();
    this.renderer.dispose();
  }
}
