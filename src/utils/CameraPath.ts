import * as THREE from 'three';

export class CameraPath {
  private camera: THREE.PerspectiveCamera;
  private basePosition: THREE.Vector3;
  private speed: number = 2; // units per second
  private swayAmplitude: number = 1.5;
  private swayFrequency: number = 0.15;
  private bobAmplitude: number = 0.3;
  private bobFrequency: number = 0.25;
  private rollAmplitude: number = 0.02;
  private rollFrequency: number = 0.1;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.basePosition = camera.position.clone();
  }

  update(elapsed: number, delta: number): void {
    // Move forward along Z axis
    this.basePosition.z -= this.speed * delta;

    // Horizontal sway (sine wave)
    const swayX = Math.sin(elapsed * this.swayFrequency * Math.PI * 2) * this.swayAmplitude;

    // Vertical bob
    const bobY = Math.sin(elapsed * this.bobFrequency * Math.PI * 2) * this.bobAmplitude;

    // Apply movement
    this.camera.position.x = this.basePosition.x + swayX;
    this.camera.position.y = this.basePosition.y + bobY;
    this.camera.position.z = this.basePosition.z;

    // Subtle roll for cinematic feel
    this.camera.rotation.z = Math.sin(elapsed * this.rollFrequency * Math.PI * 2) * this.rollAmplitude;

    // Look ahead at horizon level for grass field
    this.camera.lookAt(
      this.camera.position.x * 0.3,
      this.camera.position.y,
      this.camera.position.z - 50
    );
  }

  getPosition(): THREE.Vector3 {
    return this.basePosition.clone();
  }

  getZ(): number {
    return this.basePosition.z;
  }
}
