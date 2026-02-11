import * as THREE from 'three';
import { CharacterPool } from '../environment/CharacterPool';
import { CharacterOrbitCarousel } from '../environment/CharacterOrbitCarousel';
import { WeatherParticles } from '../environment/WeatherParticles';
import type { DevPerformanceMonitor } from '../utils/DevPerformanceMonitor';
import {
  LOCAL_WEATHER_UPDATE_EVENT,
  classifyOpenMeteoWeatherCode,
  type LocalWeatherSnapshot,
  type OpenMeteoWeatherCondition,
} from '../utils/LocalWeather';

interface FloatingCube {
  size: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  rotationSpeed: THREE.Vector3;
  baseOpacity: number;
  baseEmissiveIntensity: number;
}

interface CubeFragment {
  size: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
  baseOpacity: number;
  baseEmissiveIntensity: number;
  active: boolean;
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

interface PerfSceneToggles {
  orbitIcons: boolean;
  cubesAndFragments: boolean;
  weatherParticles: boolean;
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
const ADAPTIVE_FRAME_EMA_ALPHA = 0.08;
const ADAPTIVE_DEGRADE_FRAME_MS = 22;
const ADAPTIVE_RECOVER_FRAME_MS = 14;
const ADAPTIVE_DEGRADE_HOLD_SECONDS = 2;
const ADAPTIVE_RECOVER_HOLD_SECONDS = 7;
const ADAPTIVE_FRAGMENT_MIN_SCALE = 0.4;
const ADAPTIVE_FRAGMENT_DOWN_STEP = 0.15;
const ADAPTIVE_FRAGMENT_UP_STEP = 0.05;
const ADAPTIVE_CUBE_MIN_SCALE = 0.6;
const ADAPTIVE_CUBE_DOWN_STEP = 0.1;
const ADAPTIVE_CUBE_UP_STEP = 0.05;
const NEAR_CAMERA_FADE_START_Z_OFFSET = -75;
const NEAR_CAMERA_FADE_END_Z_OFFSET = 6;
const NEAR_CAMERA_RECYCLE_MARGIN_Z = 0.5;
const RESIZE_GUARD_INTERVAL_SECONDS = 0.5;
const FOV_UPDATE_EPSILON = 0.01;
const CUBE_BASE_COLOR = 0x0632d8;
const CUBE_EMISSIVE_COLOR = 0x0b3be8;
const CUBE_BASE_OPACITY_MIN = 0.5;
const CUBE_BASE_OPACITY_RANGE = 0.22;
const CUBE_FRAGMENT_OPACITY_SCALE = 0.5;
const FRAGMENT_GEOMETRY_BUCKET = 0.2;
const MAX_FRAGMENT_POOL = 160;
const NIGHT_BACKGROUND_TINT = new THREE.Color(0x08142f);
const NIGHT_FOG_TINT = new THREE.Color(0x122a52);
const NIGHT_CUBE_TINT = new THREE.Color(0x2a64dc);
const NIGHT_CUBE_EMISSIVE_TINT = new THREE.Color(0x3b7fff);

export class FallingScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private canvas: HTMLCanvasElement;

  private characterPool: CharacterPool;
  private orbitCarousel: CharacterOrbitCarousel;
  private weatherParticles: WeatherParticles;
  private cubeMaterial: THREE.MeshStandardMaterial;
  private cubeInstancedMaterial: THREE.MeshStandardMaterial;
  private cubeInstancedMesh: THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private cubeOpacityAttribute: THREE.InstancedBufferAttribute;
  private cubeEmissiveIntensityAttribute: THREE.InstancedBufferAttribute;
  private fragmentInstancedMaterial: THREE.MeshStandardMaterial;
  private fragmentInstancedMesh: THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private fragmentOpacityAttribute: THREE.InstancedBufferAttribute;
  private fragmentEmissiveIntensityAttribute: THREE.InstancedBufferAttribute;
  private readonly cubeTransform = new THREE.Object3D();
  private readonly fragmentTransform = new THREE.Object3D();

  private ambientLight: THREE.AmbientLight;
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;

  private cubes: FloatingCube[] = [];
  private fragments: CubeFragment[] = [];
  private activeFragmentCount = 0;

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
  private readonly targetCubeColor = new THREE.Color(CUBE_BASE_COLOR);
  private readonly targetCubeEmissiveColor = new THREE.Color(CUBE_EMISSIVE_COLOR);
  private lastCubeColorHex = CUBE_BASE_COLOR;
  private lastCubeEmissiveHex = CUBE_EMISSIVE_COLOR;

  private stormMode = false;
  private stormFlashTimeLeft = 0;
  private stormFlashDuration = 0.12;
  private stormFlashStrength = 0;

  private animationFrameId: number | null = null;
  private disposed = false;
  private perfMonitor: DevPerformanceMonitor | null = null;
  private glowTexture: THREE.CanvasTexture | null = null;
  private glowMaterial: THREE.SpriteMaterial | null = null;
  private glowSprite: THREE.Sprite | null = null;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private nextResizeGuardAt = RESIZE_GUARD_INTERVAL_SECONDS;
  private smoothedFrameMs = 16.7;
  private lowPerfSeconds = 0;
  private highPerfSeconds = 0;
  private adaptiveFragmentScale = 1;
  private adaptiveCubeScale = 1;
  private renderedCubeCount = CUBE_COUNT;
  private readonly perfToggles: PerfSceneToggles;

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
    this.perfToggles = this.resolvePerfSceneToggles();

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
    if (__TBO_DEV__) {
      void import('../utils/DevPerformanceMonitor')
        .then(({ DevPerformanceMonitor }) => {
          if (this.disposed) {
            return;
          }
          this.perfMonitor = DevPerformanceMonitor.tryCreate(this.renderer);
        })
        .catch((error) => {
          console.warn('Failed to initialize dev performance monitor:', error);
        });
    }

    this.cubeMaterial = new THREE.MeshStandardMaterial({
      color: CUBE_BASE_COLOR,
      emissive: CUBE_EMISSIVE_COLOR,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.0,
      transparent: true,
      depthWrite: false,
      alphaHash: false,
      alphaTest: 0,
      opacity: 1,
    });
    this.cubeInstancedMaterial = this.cubeMaterial.clone();
    this.cubeInstancedMaterial.opacity = 1;
    this.cubeInstancedMaterial.emissiveIntensity = 1;
    this.configureInstancedCubeMaterial(this.cubeInstancedMaterial);

    this.cubeInstancedMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.cubeInstancedMaterial,
      CUBE_COUNT
    );
    this.cubeInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cubeInstancedMesh.frustumCulled = false;
    this.cubeOpacityAttribute = new THREE.InstancedBufferAttribute(new Float32Array(CUBE_COUNT), 1);
    this.cubeEmissiveIntensityAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(CUBE_COUNT),
      1
    );
    this.cubeInstancedMesh.geometry.setAttribute('instanceOpacity', this.cubeOpacityAttribute);
    this.cubeInstancedMesh.geometry.setAttribute(
      'instanceEmissiveIntensity',
      this.cubeEmissiveIntensityAttribute
    );
    this.scene.add(this.cubeInstancedMesh);

    this.fragmentInstancedMaterial = this.cubeMaterial.clone();
    this.fragmentInstancedMaterial.opacity = 1;
    this.fragmentInstancedMaterial.emissiveIntensity = 1;
    this.configureInstancedCubeMaterial(this.fragmentInstancedMaterial);
    this.fragmentInstancedMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.fragmentInstancedMaterial,
      MAX_FRAGMENT_POOL
    );
    this.fragmentInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.fragmentInstancedMesh.frustumCulled = false;
    this.fragmentOpacityAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_FRAGMENT_POOL),
      1
    );
    this.fragmentEmissiveIntensityAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_FRAGMENT_POOL),
      1
    );
    this.fragmentInstancedMesh.geometry.setAttribute(
      'instanceOpacity',
      this.fragmentOpacityAttribute
    );
    this.fragmentInstancedMesh.geometry.setAttribute(
      'instanceEmissiveIntensity',
      this.fragmentEmissiveIntensityAttribute
    );
    this.scene.add(this.fragmentInstancedMesh);

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
    this.orbitCarousel = new CharacterOrbitCarousel(
      this.scene,
      this.camera,
      this.canvas,
      this.characterPool
    );
    this.weatherParticles = new WeatherParticles(this.scene);
    if (!this.perfToggles.weatherParticles) {
      this.weatherParticles.setVisible(false);
    }
    void this.loadCharacter();

    this.createInitialCubes();
    this.initializeFragmentPool();
    if (!this.perfToggles.cubesAndFragments) {
      this.cubeInstancedMesh.visible = false;
      this.fragmentInstancedMesh.visible = false;
    }

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

  private configureInstancedCubeMaterial(material: THREE.MeshStandardMaterial): void {
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
attribute float instanceOpacity;
attribute float instanceEmissiveIntensity;
varying float vInstanceOpacity;
varying float vInstanceEmissiveIntensity;
${shader.vertexShader}`;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vInstanceOpacity = instanceOpacity;
vInstanceEmissiveIntensity = instanceEmissiveIntensity;`
      );

      shader.fragmentShader = `
varying float vInstanceOpacity;
varying float vInstanceEmissiveIntensity;
${shader.fragmentShader}`;

      shader.fragmentShader = shader.fragmentShader.replace(
        'vec3 totalEmissiveRadiance = emissive;',
        'vec3 totalEmissiveRadiance = emissive * vInstanceEmissiveIntensity;'
      );
      if (shader.fragmentShader.includes('#include <alphatest_fragment>')) {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <alphatest_fragment>',
          `diffuseColor.a *= vInstanceOpacity;
#include <alphatest_fragment>`
        );
      } else {
        shader.fragmentShader = shader.fragmentShader.replace(
          'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
          `diffuseColor.a *= vInstanceOpacity;
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`
        );
      }
    };
    material.customProgramCacheKey = () => 'tbo-instanced-cube-v2';
  }

  private createRandomCubeVisualValues(): {
    opacity: number;
    emissiveIntensity: number;
  } {
    return {
      opacity: CUBE_BASE_OPACITY_MIN + Math.random() * CUBE_BASE_OPACITY_RANGE,
      emissiveIntensity: 0.8 + Math.random() * 0.6,
    };
  }

  private createCubeState(z: number): FloatingCube {
    const values = this.createRandomCubeVisualValues();
    const cube: FloatingCube = {
      size: 1,
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      rotationSpeed: new THREE.Vector3(),
      baseOpacity: values.opacity,
      baseEmissiveIntensity: values.emissiveIntensity,
    };
    this.resetCubeState(cube, z);
    return cube;
  }

  private resetCubeState(cube: FloatingCube, z: number): void {
    const cubeSize = this.randomCubeSize();
    const values = this.createRandomCubeVisualValues();
    cube.size = cubeSize;
    cube.baseOpacity = values.opacity;
    cube.baseEmissiveIntensity = values.emissiveIntensity;

    cube.position.set(
      (Math.random() - 0.5) * XY_SPREAD * 2,
      (Math.random() - 0.5) * XY_SPREAD * 2,
      z
    );
    cube.rotation.set(
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

  private createInitialCubes(): void {
    for (let i = 0; i < CUBE_COUNT; i += 1) {
      const z = -10 - i * (Math.abs(RESET_Z) / CUBE_COUNT);
      this.cubes.push(this.createCubeState(z));
    }
  }

  private initializeFragmentPool(): void {
    const fragmentOpacities = this.fragmentOpacityAttribute.array as Float32Array;
    const fragmentEmissive = this.fragmentEmissiveIntensityAttribute.array as Float32Array;

    for (let index = 0; index < MAX_FRAGMENT_POOL; index += 1) {
      const fragment: CubeFragment = {
        size: FRAGMENT_GEOMETRY_BUCKET,
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(),
        rotationSpeed: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
        baseOpacity: 0,
        baseEmissiveIntensity: 0,
        active: false,
      };
      this.fragments.push(fragment);

      fragmentOpacities[index] = 0;
      fragmentEmissive[index] = 0;
      this.fragmentTransform.position.set(0, 0, -1000);
      this.fragmentTransform.rotation.set(0, 0, 0);
      this.fragmentTransform.scale.setScalar(0.0001);
      this.fragmentTransform.updateMatrix();
      this.fragmentInstancedMesh.setMatrixAt(index, this.fragmentTransform.matrix);
    }

    this.fragmentInstancedMesh.instanceMatrix.needsUpdate = true;
    this.fragmentOpacityAttribute.needsUpdate = true;
    this.fragmentEmissiveIntensityAttribute.needsUpdate = true;
  }

  private acquireFragment(): CubeFragment | null {
    for (const fragment of this.fragments) {
      if (!fragment.active) {
        return fragment;
      }
    }
    return null;
  }

  private spawnFragment(sourceX: number, sourceY: number, sourceZ: number): void {
    if (this.activeFragmentCount >= this.getAdaptiveMaxFragments()) {
      return;
    }

    const fragment = this.acquireFragment();
    if (!fragment) {
      return;
    }

    const shardSize = 0.2 + Math.random() * 1.5;
    fragment.size = Math.max(
      FRAGMENT_GEOMETRY_BUCKET,
      Math.round(shardSize / FRAGMENT_GEOMETRY_BUCKET) * FRAGMENT_GEOMETRY_BUCKET
    );

    const values = this.createRandomCubeVisualValues();
    values.opacity *= CUBE_FRAGMENT_OPACITY_SCALE;
    fragment.baseOpacity = values.opacity;
    fragment.baseEmissiveIntensity = values.emissiveIntensity;

    fragment.position.set(
      sourceX + (Math.random() - 0.5) * 10,
      sourceY + (Math.random() - 0.5) * 10,
      sourceZ
    );
    fragment.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    fragment.velocity.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      this.worldSpeed * 0.5 + Math.random() * 3
    );
    fragment.rotationSpeed.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    );
    fragment.life = 0;
    fragment.maxLife = 2 + Math.random() * 2;

    if (!fragment.active) {
      fragment.active = true;
      this.activeFragmentCount += 1;
    }
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
    this.updateAdaptiveQuality(delta);

    const nextFov = 75 + Math.sin(elapsed * 0.15) * 2;
    if (Math.abs(this.camera.fov - nextFov) > FOV_UPDATE_EPSILON) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    this.updateWeatherTransition(delta);
    if (this.perfToggles.weatherParticles) {
      this.weatherParticles.setWind(this.cubeDrift.x, this.cubeDrift.y, this.worldSpeed);
      this.weatherParticles.update(delta);
    }
    this.characterPool.update(delta);
    if (this.perfToggles.orbitIcons) {
      this.orbitCarousel.update(delta, this.renderer);
    }
    const cubeColorHex = this.cubeMaterial.color.getHex();
    const cubeEmissiveHex = this.cubeMaterial.emissive.getHex();
    const tintChanged =
      cubeColorHex !== this.lastCubeColorHex || cubeEmissiveHex !== this.lastCubeEmissiveHex;
    if (tintChanged) {
      this.lastCubeColorHex = cubeColorHex;
      this.lastCubeEmissiveHex = cubeEmissiveHex;
      this.cubeInstancedMaterial.color.copy(this.cubeMaterial.color);
      this.cubeInstancedMaterial.emissive.copy(this.cubeMaterial.emissive);
    }

    const fadeStartZ = this.camera.position.z + NEAR_CAMERA_FADE_START_Z_OFFSET;
    const fadeEndZ = this.camera.position.z + NEAR_CAMERA_FADE_END_Z_OFFSET;
    if (this.perfToggles.cubesAndFragments) {
      this.updateCubes(delta, fadeStartZ, fadeEndZ);
      this.updateFragments(delta, fadeStartZ, fadeEndZ, tintChanged);
    }

    if (elapsed >= this.nextResizeGuardAt) {
      this.nextResizeGuardAt = elapsed + RESIZE_GUARD_INTERVAL_SECONDS;
      this.onResize();
    }
    this.renderer.render(this.scene, this.camera);
    this.perfMonitor?.recordFrame(delta);
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

  private updateCubes(
    delta: number,
    fadeStartZ: number,
    fadeEndZ: number
  ): void {
    const moveAmount = this.worldSpeed * delta;
    const driftX = this.cubeDrift.x * delta;
    const driftY = this.cubeDrift.y * delta;
    const horizontalBounds = XY_SPREAD * 2.4;
    const opacities = this.cubeOpacityAttribute.array as Float32Array;
    const emissiveIntensities = this.cubeEmissiveIntensityAttribute.array as Float32Array;
    const activeCubeCount = this.getAdaptiveCubeCount();
    const nearCameraRecycleZ = fadeEndZ - NEAR_CAMERA_RECYCLE_MARGIN_Z;

    if (activeCubeCount > this.renderedCubeCount) {
      for (let index = this.renderedCubeCount; index < activeCubeCount; index += 1) {
        this.resetCubeState(this.cubes[index], -100 - Math.random() * (Math.abs(RESET_Z) - 100));
      }
    }
    this.renderedCubeCount = activeCubeCount;
    this.cubeInstancedMesh.count = activeCubeCount;

    for (let index = 0; index < activeCubeCount; index += 1) {
      const cube = this.cubes[index];
      cube.position.z += moveAmount;
      cube.position.x += driftX;
      cube.position.y += driftY;

      cube.rotation.x += cube.rotationSpeed.x * delta;
      cube.rotation.y += cube.rotationSpeed.y * delta;
      cube.rotation.z += cube.rotationSpeed.z * delta;

      if (cube.position.x > horizontalBounds) {
        cube.position.x = -horizontalBounds;
      } else if (cube.position.x < -horizontalBounds) {
        cube.position.x = horizontalBounds;
      }

      if (cube.position.y > horizontalBounds) {
        cube.position.y = -horizontalBounds;
      } else if (cube.position.y < -horizontalBounds) {
        cube.position.y = horizontalBounds;
      }

      if (
        cube.position.z > -5 &&
        cube.position.z < nearCameraRecycleZ &&
        Math.random() < this.fragmentSpawnChance
      ) {
        this.spawnFragment(cube.position.x, cube.position.y, cube.position.z);
      }

      if (cube.position.z > RECYCLE_Z || cube.position.z >= nearCameraRecycleZ) {
        this.resetCubeState(cube, -100 - Math.random() * (Math.abs(RESET_Z) - 100));
      }

      const nearCameraFade = 1 - THREE.MathUtils.smoothstep(cube.position.z, fadeStartZ, fadeEndZ);
      opacities[index] = THREE.MathUtils.clamp(
        cube.baseOpacity * this.cubeOpacityMultiplier * nearCameraFade,
        0,
        1
      );
      emissiveIntensities[index] =
        cube.baseEmissiveIntensity * this.cubeEmissiveMultiplier * nearCameraFade;

      this.cubeTransform.position.copy(cube.position);
      this.cubeTransform.rotation.copy(cube.rotation);
      this.cubeTransform.scale.setScalar(cube.size);
      this.cubeTransform.updateMatrix();
      this.cubeInstancedMesh.setMatrixAt(index, this.cubeTransform.matrix);
    }

    this.cubeInstancedMesh.instanceMatrix.needsUpdate = true;
    this.cubeOpacityAttribute.needsUpdate = true;
    this.cubeEmissiveIntensityAttribute.needsUpdate = true;
  }

  private updateFragments(
    delta: number,
    fadeStartZ: number,
    fadeEndZ: number,
    tintChanged: boolean
  ): void {
    if (tintChanged) {
      this.fragmentInstancedMaterial.color.copy(this.cubeMaterial.color);
      this.fragmentInstancedMaterial.emissive.copy(this.cubeMaterial.emissive);
    }

    const driftX = this.cubeDrift.x * delta * 0.65;
    const driftY = this.cubeDrift.y * delta * 0.65;
    const opacities = this.fragmentOpacityAttribute.array as Float32Array;
    const emissiveIntensities = this.fragmentEmissiveIntensityAttribute.array as Float32Array;
    const nearCameraRecycleZ = fadeEndZ - NEAR_CAMERA_RECYCLE_MARGIN_Z;

    for (let index = 0; index < this.fragments.length; index += 1) {
      const fragment = this.fragments[index];
      if (!fragment.active) {
        opacities[index] = 0;
        emissiveIntensities[index] = 0;
        continue;
      }

      fragment.position.x += fragment.velocity.x * delta;
      fragment.position.y += fragment.velocity.y * delta;
      fragment.position.z += fragment.velocity.z * delta;
      fragment.position.x += driftX;
      fragment.position.y += driftY;

      fragment.rotation.x += fragment.rotationSpeed.x * delta;
      fragment.rotation.y += fragment.rotationSpeed.y * delta;
      fragment.rotation.z += fragment.rotationSpeed.z * delta;

      fragment.life += delta;
      const lifeRatio = fragment.life / fragment.maxLife;

      const nearCameraFade = 1 - THREE.MathUtils.smoothstep(fragment.position.z, fadeStartZ, fadeEndZ);
      emissiveIntensities[index] =
        fragment.baseEmissiveIntensity * this.cubeEmissiveMultiplier * nearCameraFade;

      const lifeOpacity = this.getFragmentLifeOpacity(lifeRatio);
      opacities[index] = THREE.MathUtils.clamp(
        fragment.baseOpacity * this.cubeOpacityMultiplier * lifeOpacity * nearCameraFade,
        0,
        1
      );

      this.fragmentTransform.position.copy(fragment.position);
      this.fragmentTransform.rotation.copy(fragment.rotation);
      this.fragmentTransform.scale.setScalar(fragment.size);
      this.fragmentTransform.updateMatrix();
      this.fragmentInstancedMesh.setMatrixAt(index, this.fragmentTransform.matrix);

      if (
        fragment.life > fragment.maxLife ||
        fragment.position.z > 50 ||
        fragment.position.z >= nearCameraRecycleZ
      ) {
        fragment.active = false;
        fragment.life = 0;
        opacities[index] = 0;
        emissiveIntensities[index] = 0;
        this.fragmentTransform.position.set(0, 0, -1000);
        this.fragmentTransform.rotation.set(0, 0, 0);
        this.fragmentTransform.scale.setScalar(0.0001);
        this.fragmentTransform.updateMatrix();
        this.fragmentInstancedMesh.setMatrixAt(index, this.fragmentTransform.matrix);
        this.activeFragmentCount = Math.max(0, this.activeFragmentCount - 1);
      }
    }

    this.fragmentInstancedMesh.instanceMatrix.needsUpdate = true;
    this.fragmentOpacityAttribute.needsUpdate = true;
    this.fragmentEmissiveIntensityAttribute.needsUpdate = true;
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

  private updateAdaptiveQuality(delta: number): void {
    if (!this.perfToggles.cubesAndFragments || !Number.isFinite(delta) || delta <= 0) {
      return;
    }

    const frameMs = THREE.MathUtils.clamp(delta * 1000, 0, 250);
    this.smoothedFrameMs = THREE.MathUtils.lerp(
      this.smoothedFrameMs,
      frameMs,
      ADAPTIVE_FRAME_EMA_ALPHA
    );

    if (this.smoothedFrameMs > ADAPTIVE_DEGRADE_FRAME_MS) {
      this.lowPerfSeconds += delta;
      this.highPerfSeconds = 0;
      if (this.lowPerfSeconds >= ADAPTIVE_DEGRADE_HOLD_SECONDS) {
        this.lowPerfSeconds = 0;
        this.degradeAdaptiveQuality();
      }
      return;
    }

    if (this.smoothedFrameMs < ADAPTIVE_RECOVER_FRAME_MS) {
      this.highPerfSeconds += delta;
      this.lowPerfSeconds = 0;
      if (this.highPerfSeconds >= ADAPTIVE_RECOVER_HOLD_SECONDS) {
        this.highPerfSeconds = 0;
        this.recoverAdaptiveQuality();
      }
      return;
    }

    this.lowPerfSeconds = Math.max(0, this.lowPerfSeconds - delta * 0.5);
    this.highPerfSeconds = 0;
  }

  private degradeAdaptiveQuality(): void {
    if (this.adaptiveFragmentScale > ADAPTIVE_FRAGMENT_MIN_SCALE + 1e-4) {
      this.adaptiveFragmentScale = THREE.MathUtils.clamp(
        this.adaptiveFragmentScale - ADAPTIVE_FRAGMENT_DOWN_STEP,
        ADAPTIVE_FRAGMENT_MIN_SCALE,
        1
      );
      return;
    }

    this.adaptiveCubeScale = THREE.MathUtils.clamp(
      this.adaptiveCubeScale - ADAPTIVE_CUBE_DOWN_STEP,
      ADAPTIVE_CUBE_MIN_SCALE,
      1
    );
  }

  private recoverAdaptiveQuality(): void {
    if (this.adaptiveCubeScale < 1 - 1e-4) {
      this.adaptiveCubeScale = THREE.MathUtils.clamp(
        this.adaptiveCubeScale + ADAPTIVE_CUBE_UP_STEP,
        ADAPTIVE_CUBE_MIN_SCALE,
        1
      );
      return;
    }

    this.adaptiveFragmentScale = THREE.MathUtils.clamp(
      this.adaptiveFragmentScale + ADAPTIVE_FRAGMENT_UP_STEP,
      ADAPTIVE_FRAGMENT_MIN_SCALE,
      1
    );
  }

  private getAdaptiveMaxFragments(): number {
    return Math.max(
      8,
      Math.round(
        THREE.MathUtils.clamp(
          this.maxFragments * this.adaptiveFragmentScale,
          8,
          this.maxFragments
        )
      )
    );
  }

  private getAdaptiveCubeCount(): number {
    return Math.max(
      1,
      Math.round(
        THREE.MathUtils.clamp(
          CUBE_COUNT * this.adaptiveCubeScale,
          CUBE_COUNT * ADAPTIVE_CUBE_MIN_SCALE,
          CUBE_COUNT
        )
      )
    );
  }

  private applyWeatherSnapshot(snapshot: LocalWeatherSnapshot): void {
    const condition = classifyOpenMeteoWeatherCode(snapshot.weatherCode);
    const profile = this.createWeatherProfile(snapshot, condition);

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
    this.targetCubeColor.set(CUBE_BASE_COLOR);
    this.targetCubeEmissiveColor.set(CUBE_EMISSIVE_COLOR);

    this.stormMode = profile.storm;
    this.weatherParticles.setWeatherState({
      condition,
      weatherCode: snapshot.weatherCode,
      isDay: snapshot.isDay,
      temperatureF: snapshot.temperatureF,
    });
  }

  private createWeatherProfile(
    snapshot: LocalWeatherSnapshot,
    condition: OpenMeteoWeatherCondition
  ): WeatherSceneProfile {
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
    const background = new THREE.Color(dayProfile.backgroundColor)
      .multiplyScalar(0.22)
      .lerp(NIGHT_BACKGROUND_TINT, 0.72);
    const fog = new THREE.Color(dayProfile.fogColor)
      .multiplyScalar(0.28)
      .lerp(NIGHT_FOG_TINT, 0.66);
    const cube = new THREE.Color(dayProfile.cubeColor)
      .multiplyScalar(0.62)
      .lerp(NIGHT_CUBE_TINT, 0.4);
    const emissive = new THREE.Color(dayProfile.cubeEmissiveColor)
      .multiplyScalar(0.72)
      .lerp(NIGHT_CUBE_EMISSIVE_TINT, 0.45);

    return {
      ...dayProfile,
      backgroundColor: background.getHex(),
      fogColor: fog.getHex(),
      cubeColor: cube.getHex(),
      cubeEmissiveColor: emissive.getHex(),
      fogDensity: dayProfile.fogDensity * 1.08,
      worldSpeed: dayProfile.worldSpeed * 0.95,
      ambientIntensity: dayProfile.ambientIntensity * 0.44,
      keyIntensity: dayProfile.keyIntensity * 0.56,
      fillIntensity: dayProfile.fillIntensity * 0.48,
      glowOpacity: dayProfile.glowOpacity * 0.52,
    };
  }

  private isLocalDaytime(): boolean {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
  }

  private resolvePerfSceneToggles(): PerfSceneToggles {
    if (typeof window === 'undefined') {
      return {
        orbitIcons: true,
        cubesAndFragments: true,
        weatherParticles: true,
      };
    }

    const params = new URLSearchParams(window.location.search);
    const parseToggle = (key: string): boolean => {
      const value = params.get(key);
      if (value === null) {
        return true;
      }
      const normalized = value.trim().toLowerCase();
      return normalized !== '0' && normalized !== 'false' && normalized !== 'off';
    };

    return {
      orbitIcons: parseToggle('tboOrbitIcons'),
      cubesAndFragments: parseToggle('tboCubes'),
      weatherParticles: parseToggle('tboWeather'),
    };
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

    this.orbitCarousel.dispose();
    this.characterPool.dispose();
    this.weatherParticles.dispose();

    this.cubes = [];
    this.scene.remove(this.cubeInstancedMesh);
    this.cubeInstancedMesh.geometry.dispose();
    this.cubeInstancedMaterial.dispose();

    this.fragments = [];
    this.activeFragmentCount = 0;
    this.scene.remove(this.fragmentInstancedMesh);
    this.fragmentInstancedMesh.geometry.dispose();
    this.fragmentInstancedMaterial.dispose();

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
    this.perfMonitor?.dispose();
    this.perfMonitor = null;
    this.renderer.dispose();
  }
}
