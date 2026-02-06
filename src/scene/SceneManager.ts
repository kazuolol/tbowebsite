import * as THREE from 'three';
import { SkyDome } from '../environment/SkyDome';
import { Clouds3D } from '../environment/Clouds3D';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private skyDome: SkyDome;
  private clouds: Clouds3D;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private disposed = false;
  private readonly onResizeHandler = (): void => {
    this.onResize();
  };
  private readonly animateFrame = (): void => {
    this.animate();
  };

  constructor(canvas: HTMLCanvasElement) {
    // Scene setup
    this.scene = new THREE.Scene();

    // Perspective camera for 3D depth
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 0);
    this.camera.lookAt(0, 30, -100);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xd8e8f0);  // Ethereal pale blue

    // Clock for animations
    this.clock = new THREE.Clock();

    // Create sky dome
    this.skyDome = new SkyDome();
    this.scene.add(this.skyDome.mesh);

    // Create 3D clouds
    this.clouds = new Clouds3D();
    this.scene.add(this.clouds.mesh);

    // Handle resize
    window.addEventListener('resize', this.onResizeHandler);

    // Start animation loop
    this.animate();
  }

  private onResize(): void {
    if (this.disposed) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private animate(): void {
    if (this.disposed) return;
    this.animationFrameId = requestAnimationFrame(this.animateFrame);

    const elapsed = this.clock.getElapsedTime();

    // Update clouds
    this.clouds.update(elapsed);

    // Flight-like camera motion - gentle banking and sway
    const swayX = Math.sin(elapsed * 0.08) * 5;
    const swayY = Math.sin(elapsed * 0.05) * 3;
    this.camera.position.x = swayX;
    this.camera.position.y = 12 + swayY;

    // Subtle banking when moving sideways
    this.camera.rotation.z = Math.sin(elapsed * 0.08) * 0.02;

    // Slight pitch variation for turbulence feel
    this.camera.rotation.x = -0.2 + Math.sin(elapsed * 0.06) * 0.015;


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
    this.scene.remove(this.skyDome.mesh);
    this.scene.remove(this.clouds.mesh);
    this.skyDome.dispose();
    this.clouds.dispose();
    this.renderer.dispose();
  }
}
