import * as THREE from 'three';
import { FallingCharacter } from '../environment/FallingCharacter';

interface WorldFragment {
  mesh: THREE.LineSegments;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface GrassClump {
  mesh: THREE.LineSegments;
  baseZ: number;
}

interface Building {
  mesh: THREE.LineSegments;
  baseZ: number;
  width: number;
  height: number;
  depth: number;
}

export class FallingScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private character: FallingCharacter;
  private wireframeMaterial: THREE.LineBasicMaterial;

  // World elements that rush toward us (on Z axis)
  private grassClumps: GrassClump[] = [];
  private buildings: Building[] = [];
  private worldSpeed: number = 40; // How fast world rushes toward us

  // Fragments breaking off
  private fragments: WorldFragment[] = [];
  private maxFragments: number = 100;

  // Camera shake for falling sensation
  private cameraShake: THREE.Vector3 = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);
    this.scene.fog = new THREE.FogExp2(0xf5f5f5, 0.012);
    this.clock = new THREE.Clock();

    // Camera behind character, looking forward into the void
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    // Position camera behind and slightly above character
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 0, -50);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Wireframe material
    this.wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x1a1a1a,
      transparent: true,
      opacity: 0.6,
    });

    // Lighting for the character
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    // Create character (positioned in front of camera)
    this.character = new FallingCharacter(this.scene);
    this.loadCharacter();

    // Create initial world elements (ahead of us)
    this.createInitialWorld();

    // Events
    window.addEventListener('resize', this.onResize.bind(this));

    // Start
    this.animate();
  }

  private async loadCharacter(): Promise<void> {
    try {
      await this.character.load(
        '/models/YoughFemale_Rig.fbx',
        '/models/YoughFemale_Jump_Loop.fbx',
        0.02
      );
    } catch (error) {
      console.error('Failed to load character:', error);
    }
  }

  private createInitialWorld(): void {
    // Spawn grass and buildings ahead (they'll rush toward us)
    for (let i = 0; i < 20; i++) {
      this.spawnGrassClump(-50 - i * 30);
    }

    for (let i = 0; i < 12; i++) {
      this.spawnBuilding(-80 - i * 50);
    }
  }

  private spawnGrassClump(z: number): void {
    const positions: number[] = [];
    const clumpWidth = 80;
    const bladesCount = 300;

    for (let i = 0; i < bladesCount; i++) {
      const x = (Math.random() - 0.5) * clumpWidth;
      const y = (Math.random() - 0.5) * clumpWidth; // Spread vertically too (we're floating through)
      const height = 0.5 + Math.random() * 1.5;
      const lean = (Math.random() - 0.5) * 0.4;

      // Grass blade pointing in random directions
      const angle = Math.random() * Math.PI * 2;
      const dx = Math.cos(angle) * lean;
      const dy = Math.sin(angle) * lean;

      positions.push(x, y, 0, x + dx, y + dy + height * 0.5, height * 0.3);
      positions.push(x, y, 0, x - dx * 0.5, y - dy * 0.5 + height * 0.3, height * 0.2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = this.wireframeMaterial.clone();
    material.opacity = 0.4;

    const mesh = new THREE.LineSegments(geometry, material);
    mesh.position.z = z;

    this.scene.add(mesh);
    this.grassClumps.push({ mesh, baseZ: z });
  }

  private spawnBuilding(z: number): void {
    const x = (Math.random() - 0.5) * 100;
    const y = (Math.random() - 0.5) * 60;
    const width = 5 + Math.random() * 10;
    const height = 20 + Math.random() * 50;
    const depth = 5 + Math.random() * 10;

    const positions: number[] = [];
    const hw = width / 2;
    const hh = height / 2;
    const hd = depth / 2;

    // Building wireframe (centered, floating in space)
    // Front face
    positions.push(-hw, -hh, hd, hw, -hh, hd);
    positions.push(hw, -hh, hd, hw, hh, hd);
    positions.push(hw, hh, hd, -hw, hh, hd);
    positions.push(-hw, hh, hd, -hw, -hh, hd);

    // Back face
    positions.push(-hw, -hh, -hd, hw, -hh, -hd);
    positions.push(hw, -hh, -hd, hw, hh, -hd);
    positions.push(hw, hh, -hd, -hw, hh, -hd);
    positions.push(-hw, hh, -hd, -hw, -hh, -hd);

    // Connecting edges
    positions.push(-hw, -hh, -hd, -hw, -hh, hd);
    positions.push(hw, -hh, -hd, hw, -hh, hd);
    positions.push(hw, hh, -hd, hw, hh, hd);
    positions.push(-hw, hh, -hd, -hw, hh, hd);

    // Floor lines
    const floors = Math.floor(height / 5);
    for (let f = 1; f < floors; f++) {
      const fy = -hh + (f / floors) * height;
      positions.push(-hw, fy, hd, hw, fy, hd);
      positions.push(-hw, fy, -hd, hw, fy, -hd);
    }

    // Vertical divisions on front
    const divs = Math.floor(width / 3);
    for (let d = 1; d < divs; d++) {
      const dx = -hw + (d / divs) * width;
      positions.push(dx, -hh, hd, dx, hh, hd);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = this.wireframeMaterial.clone();
    material.opacity = 0.35;

    const mesh = new THREE.LineSegments(geometry, material);
    mesh.position.set(x, y, z);

    this.scene.add(mesh);
    this.buildings.push({ mesh, baseZ: z, width, height, depth });
  }

  private spawnFragment(sourcePos: THREE.Vector3, type: 'grass' | 'building'): void {
    if (this.fragments.length >= this.maxFragments) return;

    const positions: number[] = [];

    if (type === 'grass') {
      // Small grass fragment
      const size = 0.5 + Math.random() * 1;
      for (let i = 0; i < 3; i++) {
        const x = (Math.random() - 0.5) * size;
        const y = (Math.random() - 0.5) * size;
        const h = 0.3 + Math.random() * 0.5;
        positions.push(x, y, 0, x + (Math.random() - 0.5) * 0.3, y + h, (Math.random() - 0.5) * 0.2);
      }
    } else {
      // Building fragment - rectangular shard
      const w = 1 + Math.random() * 4;
      const h = 2 + Math.random() * 6;
      const d = 0.5 + Math.random() * 2;

      // Simple box outline
      positions.push(-w/2, -h/2, -d/2, w/2, -h/2, -d/2);
      positions.push(w/2, -h/2, -d/2, w/2, h/2, -d/2);
      positions.push(w/2, h/2, -d/2, -w/2, h/2, -d/2);
      positions.push(-w/2, h/2, -d/2, -w/2, -h/2, -d/2);

      positions.push(-w/2, -h/2, d/2, w/2, -h/2, d/2);
      positions.push(w/2, -h/2, d/2, w/2, h/2, d/2);
      positions.push(-w/2, -h/2, -d/2, -w/2, -h/2, d/2);
      positions.push(w/2, h/2, -d/2, w/2, h/2, d/2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = this.wireframeMaterial.clone();
    material.opacity = 0.6;

    const mesh = new THREE.LineSegments(geometry, material);
    mesh.position.copy(sourcePos);
    mesh.position.x += (Math.random() - 0.5) * 15;
    mesh.position.y += (Math.random() - 0.5) * 15;

    this.scene.add(mesh);

    this.fragments.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        this.worldSpeed * 0.6 + Math.random() * 8 // Slower than world = drifts back relative
      ),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      ),
      life: 0,
      maxLife: 3 + Math.random() * 2,
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Update character (animation + tumble)
    this.character.update(delta);

    // Move world toward us (creates falling-through sensation)
    this.updateWorld(delta, elapsed);

    // Update fragments
    this.updateFragments(delta);

    // Camera shake for falling sensation
    this.cameraShake.set(
      Math.sin(elapsed * 13) * 0.08,
      Math.sin(elapsed * 11) * 0.06,
      Math.sin(elapsed * 9) * 0.03
    );

    this.camera.position.set(
      0 + this.cameraShake.x,
      3 + this.cameraShake.y + Math.sin(elapsed * 0.7) * 0.3,
      8 + this.cameraShake.z
    );
    this.camera.lookAt(0, 0, -50);

    this.renderer.render(this.scene, this.camera);
  }

  private updateWorld(delta: number, elapsed: number): void {
    const moveAmount = this.worldSpeed * delta;

    // Move grass clumps toward camera and recycle
    for (const clump of this.grassClumps) {
      clump.mesh.position.z += moveAmount;

      // Spawn fragments as grass passes through
      if (clump.mesh.position.z > -20 && clump.mesh.position.z < 5 && Math.random() < 0.03) {
        this.spawnFragment(clump.mesh.position.clone(), 'grass');
      }

      // Recycle when past camera
      if (clump.mesh.position.z > 20) {
        clump.mesh.position.z = -580;
        clump.mesh.position.x = (Math.random() - 0.5) * 40;
        clump.mesh.position.y = (Math.random() - 0.5) * 40;
      }
    }

    // Move buildings toward camera and recycle
    for (const building of this.buildings) {
      building.mesh.position.z += moveAmount;

      // Spawn fragments as buildings pass through
      if (building.mesh.position.z > -40 && building.mesh.position.z < 10 && Math.random() < 0.04) {
        const fragmentPos = building.mesh.position.clone();
        fragmentPos.x += (Math.random() - 0.5) * building.width;
        fragmentPos.y += (Math.random() - 0.5) * building.height;
        this.spawnFragment(fragmentPos, 'building');
      }

      // Recycle when past camera
      if (building.mesh.position.z > 30) {
        building.mesh.position.z = -550;
        building.mesh.position.x = (Math.random() - 0.5) * 100;
        building.mesh.position.y = (Math.random() - 0.5) * 60;
      }
    }
  }

  private updateFragments(delta: number): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];

      // Move (world motion + individual velocity)
      frag.mesh.position.add(frag.velocity.clone().multiplyScalar(delta));

      // Rotate tumbling
      frag.mesh.rotation.x += frag.rotationSpeed.x * delta;
      frag.mesh.rotation.y += frag.rotationSpeed.y * delta;
      frag.mesh.rotation.z += frag.rotationSpeed.z * delta;

      // Age and fade
      frag.life += delta;
      const lifeRatio = frag.life / frag.maxLife;

      const mat = frag.mesh.material as THREE.LineBasicMaterial;
      if (lifeRatio < 0.1) {
        mat.opacity = 0.6 * (lifeRatio / 0.1);
      } else if (lifeRatio > 0.5) {
        mat.opacity = 0.6 * (1 - (lifeRatio - 0.5) / 0.5);
      }

      // Remove when done
      if (frag.life > frag.maxLife || frag.mesh.position.z > 50) {
        this.scene.remove(frag.mesh);
        frag.mesh.geometry.dispose();
        (frag.mesh.material as THREE.Material).dispose();
        this.fragments.splice(i, 1);
      }
    }
  }

  dispose(): void {
    this.character.dispose();

    for (const clump of this.grassClumps) {
      this.scene.remove(clump.mesh);
      clump.mesh.geometry.dispose();
      (clump.mesh.material as THREE.Material).dispose();
    }

    for (const building of this.buildings) {
      this.scene.remove(building.mesh);
      building.mesh.geometry.dispose();
      (building.mesh.material as THREE.Material).dispose();
    }

    for (const frag of this.fragments) {
      this.scene.remove(frag.mesh);
      frag.mesh.geometry.dispose();
      (frag.mesh.material as THREE.Material).dispose();
    }

    this.wireframeMaterial.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
