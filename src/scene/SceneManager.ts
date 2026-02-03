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
    this.renderer.setClearColor(0x87ceeb);

    // Clock for animations
    this.clock = new THREE.Clock();

    // Create sky dome
    this.skyDome = new SkyDome();
    this.scene.add(this.skyDome.mesh);

    // Create 3D clouds
    this.clouds = new Clouds3D();
    this.scene.add(this.clouds.mesh);

    // Handle resize
    window.addEventListener('resize', this.onResize.bind(this));

    // Start animation loop
    this.animate();
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const elapsed = this.clock.getElapsedTime();

    // Update clouds
    this.clouds.update(elapsed);

    // Gentle camera sway
    this.camera.position.x = Math.sin(elapsed * 0.05) * 3;
    this.camera.position.y = 10 + Math.sin(elapsed * 0.03) * 2;
    this.camera.rotation.z = Math.sin(elapsed * 0.02) * 0.01;

    this.renderer.render(this.scene, this.camera);
  }
}
