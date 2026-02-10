import * as THREE from 'three';
import { FriendsIconRuntime } from './menu-icon/buildFriendsIcon';
import { buildKeyIcon } from './menu-icon/buildKeyIcon';
import {
  buildGlobeIcon,
  createEmptyGlobeIconState,
  updateGlobeOrbitNodes,
  type GlobeIconState,
} from './menu-icon/buildGlobeIcon';
import {
  buildInboxIcon,
  createEmptyInboxIconState,
  updateInboxOrbitParticles,
  type InboxIconState,
} from './menu-icon/buildInboxIcon';

export type IconType = 'key' | 'globe' | 'info' | 'inbox' | 'friends';

export class MenuIcon3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Group;
  private type: IconType;
  private ctx: CanvasRenderingContext2D;
  private elapsed = 0;
  private readonly ambientLight: THREE.AmbientLight;
  private readonly directionalLight: THREE.DirectionalLight;
  private externalRoot: THREE.Group | null = null;
  private mountedExternally = false;
  private disposed = false;
  private infoBuildRequestId = 0;
  private globeState: GlobeIconState = createEmptyGlobeIconState();
  private inboxState: InboxIconState = createEmptyInboxIconState();
  private friendsRuntime: FriendsIconRuntime | null = null;
  private readonly rendererSize = new THREE.Vector2();
  private static readonly KEY_SPIN_SPEED = 1.05;

  constructor(canvas: HTMLCanvasElement, type: IconType) {
    this.type = type;
    this.ctx = canvas.getContext('2d')!;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(2, 3, 4);
    this.scene.add(this.directionalLight);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    switch (type) {
      case 'key':
        this.buildKey();
        this.applyGroupTransform(0, Math.PI * 0.5, 0, 1);
        this.freezeStaticIconTransforms([this.group]);
        this.camera.position.set(0, 0, 5.6);
        break;
      case 'globe':
        this.buildGlobe();
        this.applyGroupTransform(-0.18, 0.46, 0.04, 1);
        this.applyGlobeStaticState();
        this.freezeStaticIconTransforms(this.globeState.packetNodes.map((packet) => packet.mesh));
        this.camera.position.set(0, 0, 5.2);
        break;
      case 'info':
        this.applyGroupTransform(-0.45, 0.18, -0.08, 1);
        void this.buildInfo();
        this.camera.position.set(0, 0, 4.5);
        break;
      case 'inbox':
        this.buildInboxPlaceholder();
        this.applyGroupTransform(-0.1, 0.04, -0.09, 0.9);
        this.freezeStaticIconTransforms(
          this.inboxState.orbitParticles.map((particle) => particle.sprite)
        );
        this.camera.position.set(0, 0, 4.8);
        break;
      case 'friends':
        this.buildFriendsPlaceholder();
        this.applyGroupTransform(-0.12, 0.3, 0.02, 0.92);
        this.freezeStaticIconTransforms();
        this.camera.position.set(0, 0, 5.0);
        break;
    }

    this.camera.lookAt(0, 0, 0);
  }

  public mountToObject(parent: THREE.Object3D, layer?: number): THREE.Group {
    if (!this.externalRoot) {
      this.externalRoot = new THREE.Group();
      this.externalRoot.name = `MenuIcon3D-${this.type}`;

      const movableChildren = this.scene.children.slice();
      for (const child of movableChildren) {
        this.scene.remove(child);
        this.externalRoot.add(child);
      }
    }

    if (this.externalRoot.parent && this.externalRoot.parent !== parent) {
      this.externalRoot.parent.remove(this.externalRoot);
    }
    if (this.externalRoot.parent !== parent) {
      parent.add(this.externalRoot);
    }

    if (layer !== undefined) {
      this.applyLayer(this.externalRoot, layer);
    }
    this.mountedExternally = true;
    return this.externalRoot;
  }

  private applyLayer(root: THREE.Object3D, layer: number): void {
    root.traverse((obj) => {
      obj.layers.set(layer);
    });
  }

  private buildKey(): void {
    buildKeyIcon(this.group, this.scene);
  }

  private buildGlobe(): void {
    this.globeState = buildGlobeIcon(this.group, this.scene);
  }

  private buildInboxPlaceholder(): void {
    this.inboxState = buildInboxIcon(this.group, this.scene, this.elapsed, (inner, mid, outer) =>
      this.createRadialGlowTexture(inner, mid, outer)
    );
  }

  private buildFriendsPlaceholder(): void {
    this.friendsRuntime = new FriendsIconRuntime(this.group, this.scene);
  }

  private applyGroupTransform(
    rotationX: number,
    rotationY: number,
    rotationZ: number,
    scale: number
  ): void {
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(rotationX, rotationY, rotationZ);
    this.group.scale.setScalar(scale);
  }

  private applyGlobeStaticState(): void {
    for (const panel of this.globeState.auxPanels) {
      panel.group.position.set(panel.baseX, panel.baseY, panel.baseZ);
      panel.group.rotation.y = panel.baseRotY;
      panel.group.rotation.z = panel.baseRotZ;
    }

    for (const pulse of this.globeState.pulseMaterials) {
      pulse.material.opacity = pulse.baseOpacity;
    }
  }

  private freezeStaticIconTransforms(dynamicObjects: readonly THREE.Object3D[] = []): void {
    const dynamicSet = new Set(dynamicObjects);
    this.group.traverse((obj) => {
      if (dynamicSet.has(obj)) {
        return;
      }
      obj.matrixAutoUpdate = false;
      obj.updateMatrix();
    });
  }

  private createRadialGlowTexture(inner: string, mid: string, outer: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.4, mid);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private syncRendererSize(renderer: THREE.WebGLRenderer): void {
    const targetWidth = this.ctx.canvas.width;
    const targetHeight = this.ctx.canvas.height;
    renderer.getSize(this.rendererSize);
    if (this.rendererSize.x === targetWidth && this.rendererSize.y === targetHeight) {
      return;
    }
    renderer.setSize(targetWidth, targetHeight, false);
  }

  private createEnvelopePaperMaps(): {
    color: THREE.CanvasTexture;
    bump: THREE.CanvasTexture;
    roughness: THREE.CanvasTexture;
  } {
    const width = 768;
    const height = 512;
    const hash = (seed: number): number => {
      const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
      return value - Math.floor(value);
    };

    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = width;
    colorCanvas.height = height;
    const colorCtx = colorCanvas.getContext('2d')!;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpCtx = bumpCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = width;
    roughCanvas.height = height;
    const roughCtx = roughCanvas.getContext('2d')!;

    const baseGradient = colorCtx.createLinearGradient(0, 0, width, height);
    baseGradient.addColorStop(0, '#f4f1e8');
    baseGradient.addColorStop(0.5, '#ece8dd');
    baseGradient.addColorStop(1, '#ddd8cc');
    colorCtx.fillStyle = baseGradient;
    colorCtx.fillRect(0, 0, width, height);

    for (let i = 0; i < 1200; i++) {
      const x = hash(i + 3) * width;
      const y = hash(i + 13) * height;
      const radius = 0.6 + hash(i + 23) * 1.8;
      const alpha = 0.015 + hash(i + 41) * 0.04;
      colorCtx.fillStyle = `rgba(120, 116, 103, ${alpha})`;
      colorCtx.beginPath();
      colorCtx.arc(x, y, radius, 0, Math.PI * 2);
      colorCtx.fill();
    }

    for (let i = 0; i < 28; i++) {
      const y = 18 + i * 16 + hash(i + 61) * 9;
      const alpha = 0.015 + hash(i + 71) * 0.03;
      colorCtx.strokeStyle = `rgba(113, 109, 96, ${alpha})`;
      colorCtx.lineWidth = 0.7 + hash(i + 79) * 0.5;
      colorCtx.beginPath();
      colorCtx.moveTo(-16, y);
      colorCtx.bezierCurveTo(width * 0.2, y + 5, width * 0.7, y - 4, width + 16, y + 3);
      colorCtx.stroke();
    }

    colorCtx.strokeStyle = 'rgba(126, 122, 110, 0.28)';
    colorCtx.lineWidth = 2;
    colorCtx.beginPath();
    colorCtx.moveTo(width * 0.18, height * 0.24);
    colorCtx.lineTo(width * 0.5, height * 0.52);
    colorCtx.lineTo(width * 0.82, height * 0.24);
    colorCtx.stroke();

    colorCtx.font = 'italic 56px "Times New Roman", serif';
    colorCtx.fillStyle = 'rgba(78, 78, 72, 0.62)';
    colorCtx.fillText('Mary', width * 0.7, height * 0.84);
    colorCtx.strokeStyle = 'rgba(78, 78, 72, 0.5)';
    colorCtx.lineWidth = 2;
    colorCtx.beginPath();
    colorCtx.moveTo(width * 0.67, height * 0.86);
    colorCtx.lineTo(width * 0.83, height * 0.88);
    colorCtx.stroke();

    bumpCtx.fillStyle = 'rgb(128,128,128)';
    bumpCtx.fillRect(0, 0, width, height);
    for (let i = 0; i < 720; i++) {
      const x = hash(i + 97) * width;
      const y = hash(i + 107) * height;
      const radius = 0.8 + hash(i + 117) * 2.2;
      const luminance = Math.floor(108 + hash(i + 127) * 46);
      bumpCtx.fillStyle = `rgb(${luminance},${luminance},${luminance})`;
      bumpCtx.beginPath();
      bumpCtx.arc(x, y, radius, 0, Math.PI * 2);
      bumpCtx.fill();
    }
    for (let i = 0; i < 16; i++) {
      const y = 22 + i * 26 + hash(i + 137) * 12;
      const luminance = Math.floor(116 + hash(i + 149) * 22);
      bumpCtx.strokeStyle = `rgb(${luminance},${luminance},${luminance})`;
      bumpCtx.lineWidth = 1.2 + hash(i + 157) * 0.9;
      bumpCtx.beginPath();
      bumpCtx.moveTo(-20, y);
      bumpCtx.bezierCurveTo(width * 0.22, y + 8, width * 0.66, y - 7, width + 20, y + 6);
      bumpCtx.stroke();
    }

    roughCtx.fillStyle = 'rgb(230,230,230)';
    roughCtx.fillRect(0, 0, width, height);
    for (let i = 0; i < 1100; i++) {
      const x = hash(i + 167) * width;
      const y = hash(i + 179) * height;
      const size = 1 + hash(i + 191) * 2.4;
      const luminance = Math.floor(202 + hash(i + 199) * 46);
      roughCtx.fillStyle = `rgb(${luminance},${luminance},${luminance})`;
      roughCtx.fillRect(x, y, size, size);
    }

    const color = new THREE.CanvasTexture(colorCanvas);
    color.colorSpace = THREE.SRGBColorSpace;
    color.needsUpdate = true;

    const bump = new THREE.CanvasTexture(bumpCanvas);
    bump.needsUpdate = true;

    const roughness = new THREE.CanvasTexture(roughCanvas);
    roughness.needsUpdate = true;

    return { color, bump, roughness };
  }

  private createPortalStreakTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const lineGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    lineGradient.addColorStop(0, 'rgba(44, 93, 255, 0)');
    lineGradient.addColorStop(0.2, 'rgba(0, 56, 230, 0.56)');
    lineGradient.addColorStop(0.5, 'rgba(212, 227, 255, 0.96)');
    lineGradient.addColorStop(0.8, 'rgba(0, 48, 210, 0.58)');
    lineGradient.addColorStop(1, 'rgba(44, 93, 255, 0)');

    const verticalMask = ctx.createLinearGradient(0, 0, 0, canvas.height);
    verticalMask.addColorStop(0, 'rgba(255, 255, 255, 0)');
    verticalMask.addColorStop(0.35, 'rgba(255, 255, 255, 0.95)');
    verticalMask.addColorStop(0.65, 'rgba(255, 255, 255, 0.95)');
    verticalMask.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = lineGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = verticalMask;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createPortalVortexTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    const arcCount = 180;
    for (let i = 0; i < arcCount; i++) {
      const t = i / arcCount;
      const radius = 10 + Math.pow(t, 0.78) * 218;
      const start = i * 0.31 + t * 3.2;
      const sweep = 0.52 + (1 - t) * 1.34;
      const r = Math.round(0 + (1 - t) * 95);
      const g = Math.round(36 + (1 - t) * 112);
      const alpha = 0.1 + (1 - t) * 0.52;

      ctx.strokeStyle = `rgba(${r}, ${g}, 255, ${alpha})`;
      ctx.lineWidth = 1.2 + (1 - t) * 7.8;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, start + sweep);
      ctx.stroke();
    }

    const centerGlow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 128);
    centerGlow.addColorStop(0, 'rgba(227, 238, 255, 0.86)');
    centerGlow.addColorStop(0.35, 'rgba(74, 118, 255, 0.6)');
    centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = centerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 128, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 18, 86, 0.42)';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private async buildInfo(): Promise<void> {
    const requestId = ++this.infoBuildRequestId;
    try {
      const { buildInfoIcon } = await import('./menu-icon/buildInfoIcon');
      if (this.disposed || this.type !== 'info' || requestId !== this.infoBuildRequestId) {
        return;
      }
      buildInfoIcon(this.group);
      this.freezeStaticIconTransforms();
    } catch (error) {
      console.warn('Failed to build info icon:', error);
    }
  }

  /** Update animation state; optionally render via shared renderer and blit to display canvas. */
  update(delta: number, renderer?: THREE.WebGLRenderer): void {
    this.elapsed += delta;
    const renderToCanvas = !this.mountedExternally;
    if (renderToCanvas) {
      if (!renderer) {
        return;
      }
      this.syncRendererSize(renderer);
      renderer.setClearColor(0x000000, 0);
    }

    if (this.type === 'globe') {
      updateGlobeOrbitNodes(this.globeState, this.elapsed);
    } else if (this.type === 'key') {
      const spinY = this.elapsed * MenuIcon3D.KEY_SPIN_SPEED + Math.PI * 0.5;
      this.group.rotation.y = spinY;
    } else if (this.type === 'inbox') {
      updateInboxOrbitParticles(this.inboxState, this.elapsed);
    } else if (this.type === 'friends') {
      this.friendsRuntime?.update(this.elapsed, renderer);
    }

    if (!renderToCanvas || !renderer) {
      return;
    }

    renderer.render(this.scene, this.camera);
    const targetWidth = this.ctx.canvas.width;
    const targetHeight = this.ctx.canvas.height;
    this.ctx.clearRect(0, 0, targetWidth, targetHeight);
    this.ctx.drawImage(
      renderer.domElement,
      0,
      0,
      renderer.domElement.width,
      renderer.domElement.height,
      0,
      0,
      targetWidth,
      targetHeight
    );
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.infoBuildRequestId += 1;

    const disposedTextures = new Set<string>();
    const disposedMaterials = new Set<string>();
    const textureSlots = [
      'map',
      'alphaMap',
      'emissiveMap',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'bumpMap',
      'aoMap',
      'specularMap',
      'envMap',
      'lightMap',
      'displacementMap',
      'gradientMap',
    ];

    const disposeMaterial = (material: THREE.Material): void => {
      if (disposedMaterials.has(material.uuid)) {
        return;
      }

      const texturedMaterial = material as THREE.Material & Record<string, unknown>;
      for (const slot of textureSlots) {
        const texture = texturedMaterial[slot] as THREE.Texture | null | undefined;
        if (!texture || disposedTextures.has(texture.uuid)) continue;
        texture.dispose();
        disposedTextures.add(texture.uuid);
      }

      material.dispose();
      disposedMaterials.add(material.uuid);
    };

    const disposeObject = (obj: THREE.Object3D): void => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(disposeMaterial);
        } else {
          disposeMaterial(obj.material);
        }
      } else if (obj instanceof THREE.Sprite) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(disposeMaterial);
        } else {
          disposeMaterial(obj.material);
        }
      }
    };

    if (this.externalRoot) {
      this.externalRoot.traverse(disposeObject);
      if (this.externalRoot.parent) {
        this.externalRoot.parent.remove(this.externalRoot);
      }
    }
    this.scene.traverse(disposeObject);

    this.globeState = createEmptyGlobeIconState();
    this.inboxState = createEmptyInboxIconState();
    this.friendsRuntime?.dispose();
    this.friendsRuntime = null;
    this.externalRoot = null;
    this.mountedExternally = false;
  }
}




