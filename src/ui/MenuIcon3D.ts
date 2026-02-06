import * as THREE from 'three';

export type IconType = 'rocket' | 'globe' | 'info';

const ICON_SIZE = 96; // 48 CSS px * 2 DPR

export class MenuIcon3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Group;
  private type: IconType;
  private ctx: CanvasRenderingContext2D;
  private elapsed = 0;

  constructor(canvas: HTMLCanvasElement, type: IconType) {
    this.type = type;
    this.ctx = canvas.getContext('2d')!;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(2, 3, 4);
    this.scene.add(dir);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    switch (type) {
      case 'rocket':
        this.buildRocket();
        this.camera.position.set(0, 0, 5.5);
        break;
      case 'globe':
        this.buildGlobe();
        this.camera.position.set(0, 0, 4.5);
        break;
      case 'info':
        this.buildInfo();
        this.camera.position.set(0, 0, 4.5);
        break;
    }

    this.camera.lookAt(0, 0, 0);
  }

  private buildRocket(): void {
    const bodyGeo = new THREE.ConeGeometry(0.4, 1.8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xddeeff,
      metalness: 0.1,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.2;
    this.group.add(body);

    const noseGeo = new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xe0e8f0,
      metalness: 0.2,
      roughness: 0.2,
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.y = 1.1;
    this.group.add(nose);

    const finGeo = new THREE.BoxGeometry(0.5, 0.5, 0.08);
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x3a6fd8,
      metalness: 0.2,
      roughness: 0.4,
    });
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(finGeo, finMat);
      const angle = (i / 3) * Math.PI * 2;
      fin.position.set(Math.sin(angle) * 0.4, -0.55, Math.cos(angle) * 0.4);
      fin.rotation.y = -angle;
      fin.rotation.z = -0.3;
      this.group.add(fin);
    }

    const flameGeo = new THREE.ConeGeometry(0.25, 0.6, 8);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff8844,
      emissive: 0xff6622,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = -1.0;
    flame.rotation.z = Math.PI;
    this.group.add(flame);

    const innerFlameGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
    const innerFlameMat = new THREE.MeshStandardMaterial({
      color: 0xffcc44,
      emissive: 0xffcc44,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.8,
    });
    const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
    innerFlame.position.y = -0.9;
    innerFlame.rotation.z = Math.PI;
    this.group.add(innerFlame);

    const windowGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x6ea8fe,
      emissive: 0x6ea8fe,
      emissiveIntensity: 0.4,
      metalness: 0.5,
      roughness: 0.1,
    });
    const window_ = new THREE.Mesh(windowGeo, windowMat);
    window_.position.set(0, 0.4, 0.35);
    this.group.add(window_);
  }

  private buildGlobe(): void {
    const sphereGeo = new THREE.SphereGeometry(1.2, 32, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x4a9ade,
      metalness: 0.1,
      roughness: 0.6,
      transparent: true,
      opacity: 0.9,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.group.add(sphere);

    const wireGeo = new THREE.SphereGeometry(1.22, 16, 12);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    this.group.add(wire);

    const shineGeo = new THREE.SphereGeometry(1.23, 32, 24);
    const shineMat = new THREE.MeshStandardMaterial({
      color: 0x90d0ff,
      metalness: 0.4,
      roughness: 0.2,
      transparent: true,
      opacity: 0.15,
    });
    const shine = new THREE.Mesh(shineGeo, shineMat);
    this.group.add(shine);
  }

  private buildInfo(): void {
    const orbGeo = new THREE.SphereGeometry(1.2, 32, 24);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x9070d0,
      emissive: 0x6848a8,
      emissiveIntensity: 0.3,
      metalness: 0.1,
      roughness: 0.5,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    this.group.add(orb);

    const stemGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.7, 12);
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.3,
    });
    const stem = new THREE.Mesh(stemGeo, whiteMat);
    stem.position.set(0, -0.1, 1.0);
    this.group.add(stem);

    const dotGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const dot = new THREE.Mesh(dotGeo, whiteMat);
    dot.position.set(0, 0.45, 1.0);
    this.group.add(dot);
  }

  /** Update animation state + render via shared renderer, then blit to display canvas. */
  update(delta: number, renderer: THREE.WebGLRenderer): void {
    this.elapsed += delta;
    this.group.rotation.y += delta * 0.8;

    if (this.type === 'rocket') {
      this.group.position.y = Math.sin(this.elapsed * 2.0) * 0.15;
    }

    renderer.render(this.scene, this.camera);
    this.ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    this.ctx.drawImage(renderer.domElement, 0, 0);
  }

  dispose(): void {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
