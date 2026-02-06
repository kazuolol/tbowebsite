import * as THREE from 'three';

export type IconType = 'rocket' | 'globe' | 'info';

const ICON_SIZE = 144; // 72 CSS px * 2 DPR

export class MenuIcon3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Group;
  private type: IconType;
  private ctx: CanvasRenderingContext2D;
  private elapsed = 0;
  private globeGlowSprites: THREE.Sprite[] = [];

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
        this.camera.position.set(0, 0, 5.6);
        break;
      case 'globe':
        this.buildGlobe();
        this.camera.position.set(0, 0, 4.9);
        break;
      case 'info':
        this.buildInfo();
        this.camera.position.set(0, 0, 4.5);
        break;
    }

    this.camera.lookAt(0, 0, 0);
  }

  private buildRocket(): void {
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xf7c53b,
      emissive: 0xaf7713,
      emissiveIntensity: 0.52,
      metalness: 0.56,
      roughness: 0.34,
    });
    const deepGoldMaterial = new THREE.MeshStandardMaterial({
      color: 0xdfab24,
      emissive: 0x7c4f09,
      emissiveIntensity: 0.32,
      metalness: 0.42,
      roughness: 0.46,
    });

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 1.75, 12),
      goldMaterial
    );
    shaft.position.set(0, -0.06, 0);
    this.group.add(shaft);

    const shaftTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.112, 0.112, 0.24, 12),
      deepGoldMaterial
    );
    shaftTop.position.set(0, 0.88, 0);
    this.group.add(shaftTop);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.038, 8, 18),
      deepGoldMaterial
    );
    collar.rotation.x = Math.PI * 0.5;
    collar.position.set(0, 0.72, 0);
    this.group.add(collar);

    const bitStem = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.38, 0.18),
      goldMaterial
    );
    bitStem.position.set(0.02, 1.08, 0);
    this.group.add(bitStem);

    const toothTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.12, 0.18),
      goldMaterial
    );
    toothTop.position.set(0.24, 1.2, 0);
    this.group.add(toothTop);

    const toothMid = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.12, 0.18),
      deepGoldMaterial
    );
    toothMid.position.set(0.21, 1.04, 0);
    this.group.add(toothMid);

    const toothLow = new THREE.Mesh(
      new THREE.BoxGeometry(0.39, 0.12, 0.18),
      goldMaterial
    );
    toothLow.position.set(0.17, 0.88, 0);
    this.group.add(toothLow);

    const toothTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.24, 0.18),
      deepGoldMaterial
    );
    toothTip.position.set(0.43, 1.11, 0);
    this.group.add(toothTip);

    const neckLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.26, 0.18),
      deepGoldMaterial
    );
    neckLeft.position.set(-0.1, -0.94, 0);
    neckLeft.rotation.z = 0.4;
    this.group.add(neckLeft);

    const neckRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.26, 0.18),
      deepGoldMaterial
    );
    neckRight.position.set(0.1, -0.94, 0);
    neckRight.rotation.z = -0.4;
    this.group.add(neckRight);

    const bowOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.315, 0.11, 10, 24),
      goldMaterial
    );
    bowOuter.scale.y = 0.8;
    bowOuter.position.set(0, -1.18, 0);
    this.group.add(bowOuter);

    const bowInnerAccent = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.06, 8, 18),
      deepGoldMaterial
    );
    bowInnerAccent.scale.y = 0.8;
    bowInnerAccent.position.set(0, -1.18, 0.02);
    this.group.add(bowInnerAccent);

    const keyGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createRadialGlowTexture(
          'rgba(255, 226, 142, 0.74)',
          'rgba(214, 146, 42, 0.30)',
          'rgba(0, 0, 0, 0)'
        ),
        color: 0xffd062,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    keyGlow.position.set(0.02, 0.02, -0.52);
    keyGlow.scale.set(2.95, 4.35, 1);
    this.group.add(keyGlow);

    this.group.rotation.x = -0.06;
    this.group.rotation.z = -0.14;
  }

  private buildGlobe(): void {
    const radius = 1.2;
    const ringThickness = 0.013;
    const meridianCount = 18;
    const latitudeCount = 14;

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.96, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x0b3b1e,
        emissiveIntensity: 0.16,
        metalness: 0.0,
        roughness: 1.0,
        transparent: true,
        opacity: 0.52,
      })
    );
    this.group.add(core);

    const meridianMaterial = new THREE.MeshStandardMaterial({
      color: 0x3fd970,
      emissive: 0x2bb65f,
      emissiveIntensity: 0.58,
      metalness: 0.0,
      roughness: 0.15,
    });

    for (let i = 0; i < meridianCount; i++) {
      const meridian = new THREE.Mesh(
        new THREE.TorusGeometry(radius, ringThickness, 8, 96),
        meridianMaterial
      );
      meridian.rotation.y = (i / meridianCount) * Math.PI * 2;
      this.group.add(meridian);
    }

    const lowColor = new THREE.Color(0x0f7e3b);
    const highColor = new THREE.Color(0x4fd37a);
    for (let i = 1; i <= latitudeCount; i++) {
      const t = i / (latitudeCount + 1);
      const latitude = (t - 0.5) * Math.PI;
      const ringRadius = Math.cos(latitude) * radius;
      const y = Math.sin(latitude) * radius;
      const color = lowColor.clone().lerp(highColor, t);

      const latitudeRing = new THREE.Mesh(
        new THREE.TorusGeometry(ringRadius, ringThickness, 8, 96),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.54,
          metalness: 0.0,
          roughness: 0.2,
        })
      );
      latitudeRing.rotation.x = Math.PI / 2;
      latitudeRing.position.y = y;
      this.group.add(latitudeRing);
    }

    const haloTexture = this.createRadialGlowTexture(
      'rgba(70, 185, 100, 0.45)',
      'rgba(20, 90, 45, 0.16)',
      'rgba(0, 0, 0, 0)'
    );
    const lowerGlowTexture = this.createRadialGlowTexture(
      'rgba(30, 130, 70, 0.40)',
      'rgba(0, 70, 30, 0.18)',
      'rgba(0, 0, 0, 0)'
    );

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture,
        color: 0x46bf70,
        transparent: true,
        opacity: 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.position.set(0, -0.08, -0.55);
    halo.scale.set(4.0, 4.0, 1);
    halo.userData.baseScale = new THREE.Vector2(4.0, 4.0);
    this.group.add(halo);
    this.globeGlowSprites.push(halo);

    const lowerGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: lowerGlowTexture,
        color: 0x269955,
        transparent: true,
        opacity: 0.20,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    lowerGlow.position.set(0, -0.7, -0.7);
    lowerGlow.scale.set(4.8, 3.2, 1);
    lowerGlow.userData.baseScale = new THREE.Vector2(4.8, 3.2);
    this.group.add(lowerGlow);
    this.globeGlowSprites.push(lowerGlow);

    this.group.rotation.x = -0.18;
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

  private buildInfo(): void {
    const paperWidth = 2.0;
    const paperHeight = 2.6;
    const paperGeometry = new THREE.PlaneGeometry(paperWidth, paperHeight, 26, 32);
    const positions = paperGeometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const normalizedX = x / (paperWidth * 0.5);
      const normalizedY = y / (paperHeight * 0.5);
      const centerCurve = Math.sin(normalizedY * Math.PI) * 0.035;
      const cornerDistance = Math.abs(normalizedX * normalizedY);
      const cornerCurl = Math.pow(cornerDistance, 1.85) * 0.22;
      const cornerSign = normalizedX * normalizedY > 0 ? 1 : -0.35;
      positions.setZ(i, centerCurve + cornerCurl * cornerSign);
    }

    paperGeometry.computeVertexNormals();

    const paper = new THREE.Mesh(
      paperGeometry,
      new THREE.MeshBasicMaterial({
        map: this.createPaperTexture(),
        color: 0xead7b6,
        side: THREE.DoubleSide,
      })
    );
    paper.rotation.z = -0.26;
    this.group.add(paper);

    this.group.rotation.set(-0.45, 0.18, -0.08);
  }

  private createPaperTexture(): THREE.CanvasTexture {
    const width = 512;
    const height = 640;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(64, 36, 19, 0.72)';
    ctx.lineWidth = 4;
    ctx.strokeRect(34, 38, width - 68, height - 76);

    ctx.strokeStyle = 'rgba(82, 50, 28, 0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 54, width - 100, height - 108);

    const drawCorner = (originX: number, originY: number, flipX: number, flipY: number): void => {
      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(flipX, flipY);
      ctx.strokeStyle = 'rgba(56, 29, 14, 0.84)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(0, 58);
      ctx.bezierCurveTo(14, 18, 38, 10, 72, 2);
      ctx.bezierCurveTo(40, 18, 23, 38, 6, 74);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(18, 70);
      ctx.bezierCurveTo(30, 44, 44, 30, 74, 20);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(22, 36, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    drawCorner(58, 66, 1, 1);
    drawCorner(width - 58, 66, -1, 1);
    drawCorner(58, height - 66, 1, -1);
    drawCorner(width - 58, height - 66, -1, -1);

    ctx.save();
    ctx.fillStyle = 'rgba(8, 7, 5, 0.94)';
    ctx.font = '700 38px "Times New Roman", serif';
    ctx.fillText('ABOUT US', 88, 164);

    ctx.font = '500 24px "Times New Roman", serif';
    const textLines = [
      'The Big One Initiative',
      'Exploration and discovery',
      'Persistent world systems',
      'Community driven events',
      'Character progression paths',
      'Early access development',
      'Global network operations',
    ];

    textLines.forEach((line, index) => {
      ctx.fillText(line, 88, 214 + index * 40);
    });
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /** Update animation state + render via shared renderer, then blit to display canvas. */
  update(delta: number, renderer: THREE.WebGLRenderer): void {
    this.elapsed += delta;
    if (this.type === 'globe') {
      this.group.rotation.y += delta * 0.28;
      const pulse = 1 + Math.sin(this.elapsed * 1.6) * 0.04;
      for (const glow of this.globeGlowSprites) {
        const baseScale = glow.userData.baseScale as THREE.Vector2 | undefined;
        if (!baseScale) continue;
        glow.scale.set(baseScale.x * pulse, baseScale.y * pulse, 1);
      }
    } else if (this.type === 'rocket') {
      this.group.rotation.y += delta * 1.05;
      this.group.rotation.x = -0.08;
      this.group.rotation.z = -0.14;
    } else if (this.type === 'info') {
      this.group.rotation.y += delta * 1.0;
      this.group.rotation.x = -0.45 + Math.sin(this.elapsed * 0.9) * 0.05;
      this.group.rotation.z = -0.08 + Math.sin(this.elapsed * 0.8) * 0.03;
      this.group.position.y = Math.sin(this.elapsed * 1.4) * 0.03;
    } else {
      this.group.rotation.y += delta * 0.8;
    }

    renderer.render(this.scene, this.camera);
    this.ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    this.ctx.drawImage(renderer.domElement, 0, 0);
  }

  dispose(): void {
    const disposeMaterial = (material: THREE.Material): void => {
      const texturedMaterial = material as THREE.Material & { map?: THREE.Texture | null };
      texturedMaterial.map?.dispose();
      material.dispose();
    };

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
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
    });
    this.globeGlowSprites = [];
  }
}
