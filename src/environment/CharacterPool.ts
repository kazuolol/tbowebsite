import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FallingCharacter, CharacterConfig } from './FallingCharacter';

const POOL_SIZE = 10;
const SPIN_SPEED = 0.45; // rad/s — must match FallingCharacter
const MIN_ROTATIONS_BETWEEN_SWAPS = 1.5; // ~20.9s at 0.45 rad/s (2x faster swaps)
const TRANSITION_DURATION = 0.8; // seconds
const MAX_DISINTEGRATION_PARTICLES = 220;

interface DisintegrationParticle {
  mesh: THREE.Mesh;
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

  // Disintegration particles
  private disintegrationParticles: DisintegrationParticle[] = [];
  private disintegrationMaterial: THREE.MeshStandardMaterial;
  private particleGeometry: THREE.BoxGeometry;
  private disintegrationCursor = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.disintegrationMaterial = new THREE.MeshStandardMaterial({
      color: 0xddeeff,
      emissive: 0xddeeff,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.0,
      transparent: true,
      opacity: 1.0,
    });

    this.particleGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.initializeDisintegrationPool();
  }

  async preload(
    femaleModelPath: string,
    femaleAnimPath: string,
    maleModelPath: string,
    maleAnimPath: string,
    scale: number
  ): Promise<void> {
    // Load shared resources for both genders in parallel
    const [
      femaleTextureMap, maleTextureMap,
      femaleAnimClip, maleAnimClip,
      femaleBaseModel, maleBaseModel
    ] = await Promise.all([
      FallingCharacter.loadTextures('female'),
      FallingCharacter.loadTextures('male'),
      FallingCharacter.loadAnimationClip(femaleAnimPath),
      FallingCharacter.loadAnimationClip(maleAnimPath),
      this.loadBaseModel(femaleModelPath),
      this.loadBaseModel(maleModelPath),
    ]);

    try {
      // Generate 10 unique configs from mixed-gender combos
      const configs = this.generateConfigs();

      // Create pool
      for (let i = 0; i < POOL_SIZE; i++) {
        const isMale = configs[i].gender === 'male';
        const clonedModel = SkeletonUtils.clone(isMale ? maleBaseModel : femaleBaseModel) as THREE.Group;
        const character = new FallingCharacter(this.scene, configs[i]);
        character.initFromClone(
          clonedModel,
          isMale ? maleTextureMap : femaleTextureMap,
          isMale ? maleAnimClip : femaleAnimClip,
          scale
        );
        this.scene.add(clonedModel);
        this.characters.push(character);
      }

      // Show the first character
      this.characters[0].setVisible(true);
      this.loaded = true;
    } finally {
      this.disposeTextureMap(femaleTextureMap);
      this.disposeTextureMap(maleTextureMap);
    }
  }

  private async loadBaseModel(modelPath: string): Promise<THREE.Group> {
    const loader = new FBXLoader();
    return new Promise((resolve, reject) => {
      loader.load(modelPath, resolve, undefined, reject);
    });
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

  private disposeTextureMap(textureMap: { [matName: string]: THREE.Texture }): void {
    const disposed = new Set<string>();
    for (const texture of Object.values(textureMap)) {
      if (disposed.has(texture.uuid)) continue;
      texture.dispose();
      disposed.add(texture.uuid);
    }
  }

  update(delta: number): void {
    if (!this.loaded || this.characters.length === 0) return;

    // Update active (new) character
    const active = this.characters[this.activeIndex];
    active.update(delta);

    // During transition, also update the outgoing character to keep spin + animation in sync
    if (this.transitioning && this.outgoingCharacterIndex >= 0) {
      const outgoing = this.characters[this.outgoingCharacterIndex];
      outgoing.update(delta);
    }

    // Track cumulative rotation and anim time
    this.cumulativeRotation += SPIN_SPEED * delta;
    this.cumulativeAnimTime += delta;

    if (this.transitioning) {
      this.updateTransition(delta);
    } else {
      // Accumulate exact spin distance so swap cadence maps directly to rotations.
      this.rotationsSinceSwap += (SPIN_SPEED * delta) / (Math.PI * 2);

      if (this.rotationsSinceSwap >= MIN_ROTATIONS_BETWEEN_SWAPS) {
        this.cycleToNext();
      }
    }

    // Always update particles (they outlive the transition)
    this.updateDisintegrationParticles(delta);
  }

  private cycleToNext(): void {
    if (this.transitioning) return;

    this.transitioning = true;
    this.transitionProgress = 0;
    this.outgoingCharacterIndex = this.activeIndex;

    const outgoing = this.characters[this.outgoingCharacterIndex];

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
    this.transitionProgress += delta / TRANSITION_DURATION;

    if (this.transitionProgress >= 1.0) {
      this.finishTransition();
      return;
    }

    // Sweep both clip planes upward in sync
    const currentClipY = this.clipMinY + (this.clipMaxY - this.clipMinY) * this.transitionProgress;
    if (this.clipPlane) {
      this.clipPlane.constant = -currentClipY;
    }
    if (this.incomingClipPlane) {
      this.incomingClipPlane.constant = currentClipY;
    }

    // Spawn particles in a band around the dissolve front
    const bandHeight = (this.clipMaxY - this.clipMinY) * 0.15;
    const spawnYMin = currentClipY - bandHeight * 0.5;
    const spawnYMax = currentClipY + bandHeight * 0.5;

    // Taper spawn rate: ~4 at start → ~1 at end
    const spawnCount = Math.round(4 - 3 * this.transitionProgress);
    for (let i = 0; i < spawnCount; i++) {
      this.spawnDisintegrationParticle(spawnYMin, spawnYMax);
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
    this.outgoingCharacterIndex = -1;
    this.clipPlane = null;
    this.incomingClipPlane = null;
  }

  private spawnDisintegrationParticle(yMin: number, yMax: number): void {
    const particle = this.getNextFreeDisintegrationParticle();
    if (!particle) return;

    const size = 0.03 + Math.random() * 0.09;
    const mesh = particle.mesh;
    mesh.visible = true;
    mesh.scale.setScalar(size);
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.5;
    mesh.position.set(
      Math.cos(angle) * radius,
      yMin + Math.random() * (yMax - yMin),
      Math.sin(angle) * radius
    );

    const radialSpeed = 0.2 + Math.random() * 0.6;
    particle.velocity.set(
      Math.cos(angle) * radialSpeed,
      0.2 + Math.random() * 0.6,
      Math.sin(angle) * radialSpeed
    );

    particle.rotationSpeed.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    );

    particle.life = 0;
    particle.maxLife = 0.6 + Math.random() * 0.4;
    particle.initialOpacity = 1.0;
    particle.active = true;
  }

  private updateDisintegrationParticles(delta: number): void {
    for (const p of this.disintegrationParticles) {
      if (!p.active) continue;

      // Move
      p.mesh.position.x += p.velocity.x * delta;
      p.mesh.position.y += p.velocity.y * delta;
      p.mesh.position.z += p.velocity.z * delta;

      // Subtle gravity
      p.velocity.y -= 0.5 * delta;

      // Rotate
      p.mesh.rotation.x += p.rotationSpeed.x * delta;
      p.mesh.rotation.y += p.rotationSpeed.y * delta;
      p.mesh.rotation.z += p.rotationSpeed.z * delta;

      p.life += delta;
      const lifeRatio = p.life / p.maxLife;

      // Opacity lifecycle: fade-in 10% → hold 40% → fade-out 50%
      const mat = p.mesh.material as THREE.MeshStandardMaterial;
      if (lifeRatio < 0.1) {
        mat.opacity = p.initialOpacity * (lifeRatio / 0.1);
      } else if (lifeRatio < 0.5) {
        mat.opacity = p.initialOpacity;
      } else {
        mat.opacity = p.initialOpacity * (1 - (lifeRatio - 0.5) / 0.5);
      }

      // Dispose when expired
      if (p.life > p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        mat.opacity = 0;
      }
    }
  }

  private initializeDisintegrationPool(): void {
    for (let i = 0; i < MAX_DISINTEGRATION_PARTICLES; i++) {
      const material = this.disintegrationMaterial.clone();
      material.opacity = 0;

      const mesh = new THREE.Mesh(this.particleGeometry, material);
      mesh.visible = false;
      this.scene.add(mesh);

      this.disintegrationParticles.push({
        mesh,
        velocity: new THREE.Vector3(),
        rotationSpeed: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
        initialOpacity: 1.0,
        active: false,
      });
    }
  }

  private getNextFreeDisintegrationParticle(): DisintegrationParticle | null {
    for (let i = 0; i < this.disintegrationParticles.length; i++) {
      const index = (this.disintegrationCursor + i) % this.disintegrationParticles.length;
      const particle = this.disintegrationParticles[index];
      if (!particle.active) {
        this.disintegrationCursor = (index + 1) % this.disintegrationParticles.length;
        return particle;
      }
    }
    return null;
  }

  dispose(): void {
    for (const character of this.characters) {
      character.dispose();
    }
    this.characters = [];
    this.loaded = false;

    // Clean up disintegration particles
    for (const p of this.disintegrationParticles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.disintegrationParticles = [];
    this.disintegrationMaterial.dispose();
    this.particleGeometry.dispose();
  }
}

