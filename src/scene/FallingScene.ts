import * as THREE from 'three';
import { CharacterPool } from '../environment/CharacterPool';

// ── Types ──────────────────────────────────────────────────────────

interface FloatingCube {
  mesh: THREE.Mesh;
  rotationSpeed: THREE.Vector3;
}

interface CubeFragment {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
}

// ── Constants ──────────────────────────────────────────────────────

const CUBE_COUNT = 150;
const RECYCLE_Z = 25;
const RESET_Z = -500;
const XY_SPREAD = 35;
const CHARACTER_SCALE = 0.034;

// ── Scene ──────────────────────────────────────────────────────────

export class FallingScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private characterPool: CharacterPool;
  private cubeMaterial: THREE.MeshStandardMaterial;

  private cubes: FloatingCube[] = [];
  private worldSpeed: number = 12;

  private fragments: CubeFragment[] = [];
  private maxFragments: number = 80;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcccccc);
    this.scene.fog = new THREE.FogExp2(0xcccccc, 0.005);
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
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.localClippingEnabled = true;

    this.cubeMaterial = new THREE.MeshStandardMaterial({
      color: 0xddeeff,
      emissive: 0xddeeff,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9,
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    // White glow at center — peeks through fog
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const ctx = glowCanvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const glowSprite = new THREE.Sprite(glowMaterial);
    glowSprite.position.set(0, 3, -40);
    glowSprite.scale.set(60, 60, 1);
    glowSprite.renderOrder = -1;
    this.scene.add(glowSprite);

    this.characterPool = new CharacterPool(this.scene);
    this.loadCharacter();

    this.createInitialCubes();

    window.addEventListener('resize', this.onResize.bind(this));

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

  // ── Cube helpers ──────────────────────────────────────────────────

  private randomCubeSize(): number {
    const r = Math.random();
    if (r < 0.5) return 0.3 + Math.random() * 2;     // small: 0.3-2.3
    if (r < 0.85) return 2 + Math.random() * 6;       // medium: 2-8
    return 8 + Math.random() * 20;                     // large: 8-28
  }

  private createCubeMaterial(): THREE.MeshStandardMaterial {
    const mat = this.cubeMaterial.clone();
    mat.opacity = 0.7 + Math.random() * 0.3; // 0.7-1.0
    mat.emissiveIntensity = 0.8 + Math.random() * 0.6; // 0.8-1.4
    return mat;
  }

  // ── Spawn Cube ────────────────────────────────────────────────────

  private spawnCube(z: number): void {
    const cubeSize = this.randomCubeSize();
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = this.createCubeMaterial();

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
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.6 * speedScale,
        (Math.random() - 0.5) * 0.6 * speedScale,
        (Math.random() - 0.5) * 0.3 * speedScale
      ),
    });
  }

  // ── Initial scene ─────────────────────────────────────────────────

  private createInitialCubes(): void {
    for (let i = 0; i < CUBE_COUNT; i++) {
      const z = -10 - i * (Math.abs(RESET_Z) / CUBE_COUNT);
      this.spawnCube(z);
    }
  }

  // ── Fragment spawning ─────────────────────────────────────────────

  private spawnFragment(sourcePos: THREE.Vector3): void {
    if (this.fragments.length >= this.maxFragments) return;

    const shardSize = 0.2 + Math.random() * 1.5;
    const geometry = new THREE.BoxGeometry(shardSize, shardSize, shardSize);
    const material = this.createCubeMaterial();
    material.opacity = 0.5;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(sourcePos);
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
    });
  }

  // ── Resize ────────────────────────────────────────────────────────

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ── Animate ───────────────────────────────────────────────────────

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // FOV breathing
    this.camera.fov = 75 + Math.sin(elapsed * 0.15) * 2;
    this.camera.updateProjectionMatrix();

    this.characterPool.update(delta);

    this.updateCubes(delta);

    this.updateFragments(delta);

    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 0, -50);

    this.renderer.render(this.scene, this.camera);
  }

  // ── Cube update ───────────────────────────────────────────────────

  private updateCubes(delta: number): void {
    const moveAmount = this.worldSpeed * delta;

    for (const cube of this.cubes) {
      cube.mesh.position.z += moveAmount;

      cube.mesh.rotation.x += cube.rotationSpeed.x * delta;
      cube.mesh.rotation.y += cube.rotationSpeed.y * delta;
      cube.mesh.rotation.z += cube.rotationSpeed.z * delta;

      // Spawn fragments near camera
      if (cube.mesh.position.z > -5 && cube.mesh.position.z < 15 && Math.random() < 0.02) {
        this.spawnFragment(cube.mesh.position.clone());
      }

      // Recycle
      if (cube.mesh.position.z > RECYCLE_Z) {
        cube.mesh.geometry.dispose();

        const cubeSize = this.randomCubeSize();
        cube.mesh.geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const mat = cube.mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.7 + Math.random() * 0.3;
        mat.emissiveIntensity = 0.8 + Math.random() * 0.6;

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

  // ── Fragment update ───────────────────────────────────────────────

  private updateFragments(delta: number): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];

      frag.mesh.position.add(frag.velocity.clone().multiplyScalar(delta));

      frag.mesh.rotation.x += frag.rotationSpeed.x * delta;
      frag.mesh.rotation.y += frag.rotationSpeed.y * delta;
      frag.mesh.rotation.z += frag.rotationSpeed.z * delta;

      frag.life += delta;
      const lifeRatio = frag.life / frag.maxLife;

      const mat = frag.mesh.material as THREE.MeshStandardMaterial;
      if (lifeRatio < 0.1) {
        mat.opacity = 0.5 * (lifeRatio / 0.1);
      } else if (lifeRatio > 0.5) {
        mat.opacity = 0.5 * (1 - (lifeRatio - 0.5) / 0.5);
      }

      if (frag.life > frag.maxLife || frag.mesh.position.z > 50) {
        this.scene.remove(frag.mesh);
        frag.mesh.geometry.dispose();
        (frag.mesh.material as THREE.Material).dispose();
        this.fragments.splice(i, 1);
      }
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────

  dispose(): void {
    this.characterPool.dispose();

    for (const cube of this.cubes) {
      this.scene.remove(cube.mesh);
      cube.mesh.geometry.dispose();
      (cube.mesh.material as THREE.Material).dispose();
    }

    for (const frag of this.fragments) {
      this.scene.remove(frag.mesh);
      frag.mesh.geometry.dispose();
      (frag.mesh.material as THREE.Material).dispose();
    }

    this.cubeMaterial.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
