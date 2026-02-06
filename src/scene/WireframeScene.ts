import * as THREE from 'three';
import { WireframeGrass } from '../environment/WireframeGrass';
import { WireframeSkyline } from '../environment/WireframeSkyline';
import { CameraPath } from '../utils/CameraPath';
import { WireframeCharacter } from '../environment/WireframeCharacter';

export class WireframeScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private wireframeMaterial: THREE.LineBasicMaterial;
  private grass: WireframeGrass;
  private skyline: WireframeSkyline;
  private cameraPath: CameraPath;
  private characters: WireframeCharacter[] = [];
  private animationFrameId: number | null = null;
  private disposed = false;
  private readonly onResizeHandler = (): void => {
    this.onResize();
  };
  private readonly animateFrame = (): void => {
    this.animate();
  };

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);
    this.scene.fog = new THREE.Fog(0xf5f5f5, 40, 150);
    this.clock = new THREE.Clock();

    // Camera low to the ground for grass field immersion
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 1.5, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xf5f5f5);

    // Dark wireframe material
    this.wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x1a1a1a,
      linewidth: 1, // Note: linewidth only works with WebGLRenderer on some platforms
    });

    // Grass field
    this.grass = new WireframeGrass(this.scene, this.wireframeMaterial);

    // Distant skyline (castle and 5G towers)
    this.skyline = new WireframeSkyline(this.scene, this.wireframeMaterial);

    // Camera path
    this.cameraPath = new CameraPath(this.camera);

    // Load characters
    this.loadCharacters();

    // Events
    window.addEventListener('resize', this.onResizeHandler);

    // Start
    this.animate();
  }

  private async loadCharacters(): Promise<void> {
    // Spawn a few characters at different positions along the path
    const characterPositions = [
      new THREE.Vector3(5, 0, -20),
      new THREE.Vector3(-8, 0, -60),
      new THREE.Vector3(3, 0, -100),
      new THREE.Vector3(-5, 0, -150),
      new THREE.Vector3(7, 0, -200),
    ];

    for (const pos of characterPositions) {
      const character = new WireframeCharacter(this.scene, 0x1a1a1a);
      try {
        await character.load(
          '/models/YoughFemale_Rig.fbx',
          '/models/YoughFemale_Idle.fbx',
          pos,
          0.025 // Scale
        );
        // Face random direction
        character.setRotation(Math.random() * Math.PI * 2);
        if (this.disposed) {
          character.dispose();
          return;
        }
        this.characters.push(character);
      } catch (error) {
        console.warn('Failed to load character at', pos, error);
      }
    }
  }

  private onResize(): void {
    if (this.disposed) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    if (this.disposed) return;
    this.animationFrameId = requestAnimationFrame(this.animateFrame);

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Update camera movement
    this.cameraPath.update(elapsed, delta);

    // Update grass (load/unload chunks, animate sway)
    this.grass.update(this.cameraPath.getZ(), elapsed);

    // Update skyline (keep at distance, animate floating shapes)
    this.skyline.update(elapsed, this.cameraPath.getZ());

    // Update characters (animation)
    for (const character of this.characters) {
      character.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.onResizeHandler);

    this.grass.dispose();
    this.skyline.dispose();
    this.wireframeMaterial.dispose();
    for (const character of this.characters) {
      character.dispose();
    }
    this.characters = [];
    this.renderer.dispose();
  }
}
