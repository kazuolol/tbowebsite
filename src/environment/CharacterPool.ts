import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  FallingCharacter,
  CharacterConfig,
  type CharacterTextureLoadOptions,
} from './FallingCharacter';
import { withFbxWarningFilter } from './fbxWarningFilter';

const POOL_SIZE = 10;
const SPIN_SPEED = 0.45; // rad/s — must match FallingCharacter
const MIN_ROTATIONS_BETWEEN_SWAPS = 1.5; // ~20.9s at 0.45 rad/s (2x faster swaps)
const TRANSITION_DURATION = 0.8; // seconds
const MAX_DISINTEGRATION_PARTICLES = 220;
const DISINTEGRATION_DELTA_CLAMP = 1 / 20;
const DISINTEGRATION_START_RATE_PER_SECOND = 210;
const DISINTEGRATION_END_RATE_PER_SECOND = 65;
const DISINTEGRATION_MAX_SPAWNS_PER_FRAME = 16;
const DISINTEGRATION_MAX_BURST_CARRY = 48;
const DISINTEGRATION_MIN_SCALE = 0.03;
const DISINTEGRATION_SCALE_RANGE = 0.09;
const DISINTEGRATION_BASE_RADIUS = 0.2;
const DISINTEGRATION_RADIUS_JITTER = 0.45;
const DISINTEGRATION_RADIUS_PROGRESS_BOOST = 0.35;
const DISINTEGRATION_ALPHA_TEST = 0.01;

interface DisintegrationParticle {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
  initialOpacity: number;
  active: boolean;
}

export class CharacterPool {
  private scene: THREE.Scene;
  private characters: FallingCharacter[] = [];
  private activeIndex: number = 0;

  private cumulativeRotation: number = 0;
  private cumulativeAnimTime: number = 0;
  private rotationsSinceSwap: number = 0;

  private loaded: boolean = false;

  // Transition state
  private transitioning: boolean = false;
  private transitionProgress: number = 0;
  private outgoingCharacterIndex: number = -1;
  private clipPlane: THREE.Plane | null = null;
  private incomingClipPlane: THREE.Plane | null = null;
  private clipMinY: number = 0;
  private clipMaxY: number = 0;
  private readonly transitionOrigin = new THREE.Vector3();

  // Disintegration particles
  private disintegrationParticles: DisintegrationParticle[] = [];
  private disintegrationMaterial: THREE.MeshStandardMaterial;
  private disintegrationMesh: THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private disintegrationOpacityAttribute: THREE.InstancedBufferAttribute;
  private particleGeometry: THREE.BoxGeometry;
  private readonly disintegrationTransform = new THREE.Object3D();
  private disintegrationFreeIndices: number[] = [];
  private disintegrationSpawnCarry = 0;
  private femaleTextureMap: { [matName: string]: THREE.Texture } | null = null;
  private maleTextureMap: { [matName: string]: THREE.Texture } | null = null;
  private readonly textureLoadOptions: CharacterTextureLoadOptions;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.textureLoadOptions = this.resolveTextureLoadOptions();

    this.disintegrationMaterial = new THREE.MeshStandardMaterial({
      color: 0xddeeff,
      emissive: 0xddeeff,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.0,
      transparent: true,
      depthWrite: false,
      alphaTest: DISINTEGRATION_ALPHA_TEST,
      opacity: 1.0,
    });
    this.configureDisintegrationMaterial(this.disintegrationMaterial);

    this.particleGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.disintegrationMesh = new THREE.InstancedMesh(
      this.particleGeometry,
      this.disintegrationMaterial,
      MAX_DISINTEGRATION_PARTICLES
    );
    this.disintegrationMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.disintegrationMesh.frustumCulled = false;
    this.disintegrationOpacityAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_DISINTEGRATION_PARTICLES),
      1
    );
    this.disintegrationMesh.geometry.setAttribute(
      'instanceOpacity',
      this.disintegrationOpacityAttribute
    );
    this.scene.add(this.disintegrationMesh);
    this.initializeDisintegrationPool();
  }

  async preload(
    femaleModelPath: string,
    femaleAnimPath: string,
    maleModelPath: string,
    maleAnimPath: string,
    scale: number
  ): Promise<void> {
    this.disposeTextureMap(this.femaleTextureMap);
    this.disposeTextureMap(this.maleTextureMap);
    this.femaleTextureMap = null;
    this.maleTextureMap = null;

    // Load shared resources for both genders in parallel
    const [
      femaleTextureMap, maleTextureMap,
      femaleAnimClip, maleAnimClip,
      femaleBaseModel, maleBaseModel
    ] = await Promise.all([
      FallingCharacter.loadTextures('female', this.textureLoadOptions),
      FallingCharacter.loadTextures('male', this.textureLoadOptions),
      FallingCharacter.loadAnimationClip(femaleAnimPath),
      FallingCharacter.loadAnimationClip(maleAnimPath),
      this.loadBaseModel(femaleModelPath),
      this.loadBaseModel(maleModelPath),
    ]);

    this.femaleTextureMap = femaleTextureMap;
    this.maleTextureMap = maleTextureMap;
    const femaleTextures = this.femaleTextureMap;
    const maleTextures = this.maleTextureMap;
    if (!femaleTextures || !maleTextures) {
      throw new Error('Character textures failed to initialize.');
    }

    // Generate 10 unique configs from mixed-gender combos
    const configs = this.generateConfigs();

    // Create pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const isMale = configs[i].gender === 'male';
      const clonedModel = SkeletonUtils.clone(isMale ? maleBaseModel : femaleBaseModel) as THREE.Group;
      const character = new FallingCharacter(this.scene, configs[i]);
      character.initFromClone(
        clonedModel,
        isMale ? maleTextures : femaleTextures,
        isMale ? maleAnimClip : femaleAnimClip,
        scale
      );
      this.scene.add(clonedModel);
      this.characters.push(character);
    }

    // Show the first character
    this.characters[0].setVisible(true);
    this.loaded = true;
  }

  private async loadBaseModel(modelPath: string): Promise<THREE.Group> {
    const loader = new FBXLoader();
    return withFbxWarningFilter(
      () =>
        new Promise((resolve, reject) => {
          loader.load(modelPath, resolve, undefined, reject);
        })
    );
  }

  private configureDisintegrationMaterial(material: THREE.MeshStandardMaterial): void {
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
attribute float instanceOpacity;
varying float vInstanceOpacity;
${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vInstanceOpacity = instanceOpacity;`
      );

      shader.fragmentShader = `
varying float vInstanceOpacity;
${shader.fragmentShader}`;
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
    material.customProgramCacheKey = () => 'tbo-character-disintegration-v2';
  }

  private generateConfigs(): CharacterConfig[] {
    const combos: { gender: 'male' | 'female'; hair: string; outfit: string }[] = [];

    // Female combos: 5 hairs × 5 outfits (2-6) = 25
    for (let h = 1; h <= 5; h++) {
      for (let o = 2; o <= 6; o++) {
        combos.push({
          gender: 'female',
          hair: String(h).padStart(3, '0'),
          outfit: String(o).padStart(3, '0'),
        });
      }
    }

    // Male combos: 5 hairs × 4 outfits (1,2,4,5) = 20  (003 is underwear, skip it)
    for (let h = 1; h <= 5; h++) {
      for (const o of [1, 2, 4, 5]) {
        combos.push({
          gender: 'male',
          hair: String(h).padStart(3, '0'),
          outfit: String(o).padStart(3, '0'),
        });
      }
    }

    // Fisher-Yates shuffle
    for (let i = combos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combos[i], combos[j]] = [combos[j], combos[i]];
    }

    // Take first POOL_SIZE and assign evenly-spaced hair colors with jitter
    return combos.slice(0, POOL_SIZE).map((combo, i) => {
      const hue = (i / POOL_SIZE + (Math.random() - 0.5) * 0.05) % 1;
      const color = new THREE.Color();
      color.setHSL(
        hue < 0 ? hue + 1 : hue,
        0.3 + Math.random() * 0.7,
        0.3 + Math.random() * 0.4
      );
      return { ...combo, hairColor: color };
    });
  }

  private resolveTextureLoadOptions(): CharacterTextureLoadOptions {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {};
    }

    const nav = navigator as Navigator & { deviceMemory?: number };
    const deviceMemory = nav.deviceMemory;
    const isTouchDevice = navigator.maxTouchPoints > 0;
    const isCompactViewport = window.innerWidth <= 900 || window.innerHeight <= 900;

    if (typeof deviceMemory === 'number' && deviceMemory <= 2) {
      return {
        downscaleFactor: 0.5,
        maxTextureSize: 1024,
      };
    }

    if (
      (typeof deviceMemory === 'number' && deviceMemory <= 4) ||
      (isTouchDevice && isCompactViewport)
    ) {
      return {
        downscaleFactor: 0.75,
        maxTextureSize: 1536,
      };
    }

    return {};
  }

  private disposeTextureMap(textureMap: { [matName: string]: THREE.Texture } | null): void {
    if (!textureMap) {
      return;
    }
    const disposed = new Set<string>();
    for (const texture of Object.values(textureMap)) {
      if (disposed.has(texture.uuid)) continue;
      texture.dispose();
      disposed.add(texture.uuid);
    }
  }

  getActiveCharacterOrbitAnchor(target: THREE.Vector3): THREE.Vector3 | null {
    if (!this.loaded || this.characters.length === 0) {
      return null;
    }

    const active = this.characters[this.activeIndex];
    const model = active.getModel();
    if (!model) {
      return null;
    }

    const orbitAnchor = active.getOrbitAnchor(target);
    if (orbitAnchor) {
      return orbitAnchor;
    }

    model.getWorldPosition(target);

    const clipBounds = active.getClipBounds();
    if (clipBounds) {
      target.y = clipBounds.minY + (clipBounds.maxY - clipBounds.minY) * 0.62;
    } else {
      target.y += 1.8;
    }

    return target;
  }

  update(delta: number): void {
    if (!this.loaded || this.characters.length === 0) return;
    const safeDelta = Math.max(0, delta);
    const particleDelta = THREE.MathUtils.clamp(safeDelta, 0, DISINTEGRATION_DELTA_CLAMP);

    // Update active (new) character
    const active = this.characters[this.activeIndex];
    active.update(safeDelta);

    // During transition, also update the outgoing character to keep spin + animation in sync
    if (this.transitioning && this.outgoingCharacterIndex >= 0) {
      const outgoing = this.characters[this.outgoingCharacterIndex];
      outgoing.update(safeDelta);
    }

    // Track cumulative rotation and anim time
    this.cumulativeRotation += SPIN_SPEED * safeDelta;
    this.cumulativeAnimTime += safeDelta;

    if (this.transitioning) {
      this.updateTransition(safeDelta);
    } else {
      // Accumulate exact spin distance so swap cadence maps directly to rotations.
      this.rotationsSinceSwap += (SPIN_SPEED * safeDelta) / (Math.PI * 2);

      if (this.rotationsSinceSwap >= MIN_ROTATIONS_BETWEEN_SWAPS) {
        this.cycleToNext();
      }
    }

    // Always update particles (they outlive the transition)
    this.updateDisintegrationParticles(particleDelta);
  }

  private cycleToNext(): void {
    if (this.transitioning) return;

    this.transitioning = true;
    this.transitionProgress = 0;
    this.disintegrationSpawnCarry = 0;
    this.outgoingCharacterIndex = this.activeIndex;

    const outgoing = this.characters[this.outgoingCharacterIndex];
    const outgoingModel = outgoing.getModel();
    if (outgoingModel) {
      outgoingModel.getWorldPosition(this.transitionOrigin);
    } else {
      this.transitionOrigin.set(0, 0, 0);
    }

    // Use cached clip bounds to avoid swap-time box traversal.
    const clipBounds = outgoing.getClipBounds();
    if (!clipBounds) {
      // Fallback: skip transition, do instant swap
      this.finishTransition();
      return;
    }

    this.clipMinY = clipBounds.minY;
    this.clipMaxY = clipBounds.maxY;

    // Outgoing clip plane: normal (0,1,0), visible where y >= clipY
    // At start clipY = minY → nothing clipped. As clipY rises, feet dissolve upward.
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.clipMinY);
    outgoing.applyClipPlane(this.clipPlane);

    // Advance to next character
    this.activeIndex = (this.activeIndex + 1) % this.characters.length;
    this.rotationsSinceSwap = 0;

    const next = this.characters[this.activeIndex];
    next.syncTo(this.cumulativeRotation, this.cumulativeAnimTime);
    next.setVisible(true);

    // Incoming clip plane: inverted normal (0,-1,0), visible where y <= clipY
    // At start clipY = minY → nothing visible. Reveals from feet up in sync with dissolve.
    this.incomingClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), this.clipMinY);
    next.applyClipPlane(this.incomingClipPlane);
  }

  private updateTransition(delta: number): void {
    const previousProgress = this.transitionProgress;
    const nextProgress = Math.min(1, previousProgress + delta / TRANSITION_DURATION);
    this.transitionProgress = nextProgress;

    const currentClipY = this.clipMinY + (this.clipMaxY - this.clipMinY) * nextProgress;
    if (this.clipPlane) {
      this.clipPlane.constant = -currentClipY;
    }
    if (this.incomingClipPlane) {
      this.incomingClipPlane.constant = currentClipY;
    }

    const previousRate = THREE.MathUtils.lerp(
      DISINTEGRATION_START_RATE_PER_SECOND,
      DISINTEGRATION_END_RATE_PER_SECOND,
      previousProgress
    );
    const nextRate = THREE.MathUtils.lerp(
      DISINTEGRATION_START_RATE_PER_SECOND,
      DISINTEGRATION_END_RATE_PER_SECOND,
      nextProgress
    );
    const averageRate = (previousRate + nextRate) * 0.5;
    const emissionDelta = THREE.MathUtils.clamp(delta, 0, DISINTEGRATION_DELTA_CLAMP);
    this.disintegrationSpawnCarry = Math.min(
      DISINTEGRATION_MAX_BURST_CARRY,
      this.disintegrationSpawnCarry + averageRate * emissionDelta
    );

    const spawnCount = Math.min(
      DISINTEGRATION_MAX_SPAWNS_PER_FRAME,
      Math.floor(this.disintegrationSpawnCarry)
    );
    if (spawnCount > 0) {
      this.disintegrationSpawnCarry -= spawnCount;
      const bandHeight = Math.max(0.12, (this.clipMaxY - this.clipMinY) * 0.15);
      for (let i = 0; i < spawnCount; i += 1) {
        const progressT = (i + Math.random()) / spawnCount;
        const progressSample = THREE.MathUtils.lerp(previousProgress, nextProgress, progressT);
        const sampleClipY = this.clipMinY + (this.clipMaxY - this.clipMinY) * progressSample;
        const spawnYMin = sampleClipY - bandHeight * 0.5;
        const spawnYMax = sampleClipY + bandHeight * 0.5;
        this.spawnDisintegrationParticle(spawnYMin, spawnYMax, progressSample);
      }
    }

    if (this.transitionProgress >= 1.0) {
      this.finishTransition();
    }
  }

  private finishTransition(): void {
    if (this.outgoingCharacterIndex >= 0) {
      const outgoing = this.characters[this.outgoingCharacterIndex];
      outgoing.removeClipPlane();
      outgoing.setVisible(false);
    }

    // Remove clip plane from the now-fully-revealed incoming character
    const incoming = this.characters[this.activeIndex];
    incoming.removeClipPlane();

    this.transitioning = false;
    this.transitionProgress = 0;
    this.disintegrationSpawnCarry = 0;
    this.outgoingCharacterIndex = -1;
    this.clipPlane = null;
    this.incomingClipPlane = null;
  }

  private spawnDisintegrationParticle(yMin: number, yMax: number, progress: number): void {
    const index = this.acquireDisintegrationParticleIndex();
    if (index === null) return;

    const particle = this.disintegrationParticles[index];
    const angle = Math.random() * Math.PI * 2;
    const radius =
      DISINTEGRATION_BASE_RADIUS +
      Math.random() * DISINTEGRATION_RADIUS_JITTER +
      progress * DISINTEGRATION_RADIUS_PROGRESS_BOOST * Math.random();
    const radialSpeed = 0.25 + Math.random() * 0.9;

    particle.scale = DISINTEGRATION_MIN_SCALE + Math.random() * DISINTEGRATION_SCALE_RANGE;
    particle.position.set(
      this.transitionOrigin.x + Math.cos(angle) * radius,
      yMin + Math.random() * (yMax - yMin),
      this.transitionOrigin.z + Math.sin(angle) * radius
    );
    particle.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    particle.velocity.set(
      Math.cos(angle) * radialSpeed,
      0.2 + Math.random() * 0.65,
      Math.sin(angle) * radialSpeed
    );
    particle.rotationSpeed.set(
      (Math.random() - 0.5) * 4.5,
      (Math.random() - 0.5) * 4.5,
      (Math.random() - 0.5) * 4.5
    );
    particle.life = 0;
    particle.maxLife = 0.55 + Math.random() * 0.45;
    particle.initialOpacity = 1.0;
    particle.active = true;
  }

  private updateDisintegrationParticles(delta: number): void {
    const opacities = this.disintegrationOpacityAttribute.array as Float32Array;

    for (let index = 0; index < this.disintegrationParticles.length; index += 1) {
      const particle = this.disintegrationParticles[index];
      if (!particle.active) {
        opacities[index] = 0;
        continue;
      }

      particle.position.x += particle.velocity.x * delta;
      particle.position.y += particle.velocity.y * delta;
      particle.position.z += particle.velocity.z * delta;
      particle.velocity.y -= 0.6 * delta;

      particle.rotation.x += particle.rotationSpeed.x * delta;
      particle.rotation.y += particle.rotationSpeed.y * delta;
      particle.rotation.z += particle.rotationSpeed.z * delta;

      particle.life += delta;
      const lifeRatio = particle.life / particle.maxLife;

      if (lifeRatio < 0.1) {
        opacities[index] = particle.initialOpacity * (lifeRatio / 0.1);
      } else if (lifeRatio < 0.5) {
        opacities[index] = particle.initialOpacity;
      } else {
        opacities[index] = particle.initialOpacity * (1 - (lifeRatio - 0.5) / 0.5);
      }

      this.disintegrationTransform.position.copy(particle.position);
      this.disintegrationTransform.rotation.copy(particle.rotation);
      this.disintegrationTransform.scale.setScalar(particle.scale);
      this.disintegrationTransform.updateMatrix();
      this.disintegrationMesh.setMatrixAt(index, this.disintegrationTransform.matrix);

      if (particle.life > particle.maxLife) {
        particle.active = false;
        particle.life = 0;
        opacities[index] = 0;
        this.disintegrationTransform.position.set(0, 0, -1000);
        this.disintegrationTransform.rotation.set(0, 0, 0);
        this.disintegrationTransform.scale.setScalar(0.0001);
        this.disintegrationTransform.updateMatrix();
        this.disintegrationMesh.setMatrixAt(index, this.disintegrationTransform.matrix);
        this.disintegrationFreeIndices.push(index);
      }
    }

    this.disintegrationMesh.instanceMatrix.needsUpdate = true;
    this.disintegrationOpacityAttribute.needsUpdate = true;
  }

  private initializeDisintegrationPool(): void {
    const opacities = this.disintegrationOpacityAttribute.array as Float32Array;
    this.disintegrationFreeIndices = [];

    for (let index = 0; index < MAX_DISINTEGRATION_PARTICLES; index += 1) {
      this.disintegrationParticles.push({
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        scale: DISINTEGRATION_MIN_SCALE,
        velocity: new THREE.Vector3(),
        rotationSpeed: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
        initialOpacity: 1.0,
        active: false,
      });
      this.disintegrationFreeIndices.push(index);
      opacities[index] = 0;
      this.disintegrationTransform.position.set(0, 0, -1000);
      this.disintegrationTransform.rotation.set(0, 0, 0);
      this.disintegrationTransform.scale.setScalar(0.0001);
      this.disintegrationTransform.updateMatrix();
      this.disintegrationMesh.setMatrixAt(index, this.disintegrationTransform.matrix);
    }

    this.disintegrationMesh.instanceMatrix.needsUpdate = true;
    this.disintegrationOpacityAttribute.needsUpdate = true;
  }

  private acquireDisintegrationParticleIndex(): number | null {
    if (this.disintegrationFreeIndices.length === 0) {
      return null;
    }
    return this.disintegrationFreeIndices.pop() ?? null;
  }

  dispose(): void {
    for (const character of this.characters) {
      character.dispose();
    }
    this.characters = [];
    this.loaded = false;
    this.disposeTextureMap(this.femaleTextureMap);
    this.disposeTextureMap(this.maleTextureMap);
    this.femaleTextureMap = null;
    this.maleTextureMap = null;

    this.scene.remove(this.disintegrationMesh);
    this.disintegrationParticles = [];
    this.disintegrationFreeIndices = [];
    this.disintegrationMaterial.dispose();
    this.particleGeometry.dispose();
  }
}

