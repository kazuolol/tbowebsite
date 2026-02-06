import * as THREE from 'three';

export type IconType = 'rocket' | 'globe' | 'info';

const ICON_SIZE = 216; // 108 CSS px * 2 DPR

export class MenuIcon3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Group;
  private type: IconType;
  private ctx: CanvasRenderingContext2D;
  private elapsed = 0;
  private globeGlowSprites: THREE.Sprite[] = [];
  private globeOrbitalMeshes: THREE.Object3D[] = [];

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
        this.camera.position.set(0, 0, 5.2);
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
    // Base color matched to the provided blue swatch.
    const baseBlue = new THREE.Color(0x0038e6);
    const midBlue = new THREE.Color(0x2d63ff);
    const brightBlue = new THREE.Color(0x9fbfff);
    const deepBlue = new THREE.Color(0x001a82);
    const portal = new THREE.Group();
    portal.position.y = 0.04;
    this.group.add(portal);

    const backHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createRadialGlowTexture(
          'rgba(200, 220, 255, 0.8)',
          'rgba(0, 56, 230, 0.34)',
          'rgba(0, 0, 0, 0)'
        ),
        color: 0x5d87ff,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    backHalo.position.set(0, 0.02, -0.92);
    backHalo.scale.set(3.9, 3.9, 1);
    backHalo.userData.baseScale = new THREE.Vector2(3.9, 3.9);
    portal.add(backHalo);
    this.globeGlowSprites.push(backHalo);

    const coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createRadialGlowTexture(
          'rgba(255, 255, 255, 0.92)',
          'rgba(56, 96, 242, 0.6)',
          'rgba(0, 0, 0, 0)'
        ),
        color: 0xc9dbff,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    coreGlow.position.set(0, -0.01, 0.2);
    coreGlow.scale.set(2.25, 2.5, 1);
    coreGlow.userData.baseScale = new THREE.Vector2(2.25, 2.5);
    portal.add(coreGlow);
    this.globeGlowSprites.push(coreGlow);

    const portalShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.28, 36, 28),
      new THREE.MeshBasicMaterial({
        color: deepBlue,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    portalShell.scale.set(1.0, 1.12, 1.0);
    portal.add(portalShell);

    const vortexTexture = this.createPortalVortexTexture();
    for (let i = 0; i < 5; i++) {
      const size = 2.74 - i * 0.28;
      const vortexLayer = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({
          map: vortexTexture,
          color: i % 2 === 0 ? midBlue : baseBlue,
          transparent: true,
          opacity: 0.36 - i * 0.05,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      vortexLayer.position.z = -0.2 + i * 0.11;
      vortexLayer.rotation.z = i * 0.62;
      vortexLayer.userData.spinSpeed = (i % 2 === 0 ? 1 : -1) * (1.25 + i * 0.28);
      vortexLayer.userData.phase = i * 0.7;
      vortexLayer.userData.baseOpacity = 0.36 - i * 0.05;
      vortexLayer.userData.baseScale = new THREE.Vector2(size, size);
      portal.add(vortexLayer);
      this.globeOrbitalMeshes.push(vortexLayer);
    }

    const streakTexture = this.createPortalStreakTexture();
    const streakGeo = new THREE.PlaneGeometry(1.04, 0.18);

    for (let i = 0; i < 26; i++) {
      const streakGroup = new THREE.Group();
      const streak = new THREE.Mesh(
        streakGeo,
        new THREE.MeshBasicMaterial({
          map: streakTexture,
          color: i % 3 === 0 ? brightBlue : midBlue,
          transparent: true,
          opacity: 0.4 + (i % 4) * 0.06,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );

      const radius = 0.14 + (i % 7) * 0.07;
      streak.position.set(radius, Math.sin(i * 1.2) * 0.06, (i % 4) * 0.04 - 0.08);
      streak.rotation.z = (i % 2 === 0 ? 0.35 : -0.38);
      streak.scale.set(0.64 + (i % 5) * 0.1, 0.58 + (i % 3) * 0.08, 1);

      streakGroup.rotation.z = (i / 26) * Math.PI * 2;
      streakGroup.rotation.x = Math.sin(i * 0.6) * 0.18;
      streakGroup.userData.spinSpeed = 1.15 + (i % 5) * 0.22;
      portal.add(streakGroup);
      streakGroup.add(streak);
      this.globeOrbitalMeshes.push(streakGroup);
    }

    const coreHole = new THREE.Mesh(
      new THREE.CircleGeometry(0.24, 28),
      new THREE.MeshBasicMaterial({
        color: 0x1647c6,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    coreHole.position.z = 0.36;
    portal.add(coreHole);

    const ringSegments = 5;
    for (let i = 0; i < ringSegments; i++) {
      const segment = new THREE.Mesh(
        new THREE.TorusGeometry(1.28, 0.046, 10, 72, Math.PI * 0.5),
        new THREE.MeshBasicMaterial({
          color: 0x6c96ff,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      segment.rotation.z = (i / ringSegments) * Math.PI * 2 + (i % 2 === 0 ? 0.2 : -0.12);
      segment.rotation.x = 0.12;
      segment.position.z = -0.08;
      segment.userData.spinSpeed = i % 2 === 0 ? 0.24 : -0.18;
      portal.add(segment);
      this.globeOrbitalMeshes.push(segment);
    }

    const sparkMap = this.createRadialGlowTexture(
      'rgba(255, 255, 255, 0.95)',
      'rgba(151, 190, 255, 0.35)',
      'rgba(0, 0, 0, 0)'
    );
    for (let i = 0; i < 14; i++) {
      const spark = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: sparkMap,
          color: i % 4 === 0 ? 0xffffff : 0xd0e4ff,
          transparent: true,
          opacity: 0.52,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      const radius = 1.16 + (i % 4) * 0.08;
      const angle = (i / 14) * Math.PI * 2;
      spark.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.92, -0.15 + (i % 3) * 0.1);
      const size = 0.1 + (i % 4) * 0.025;
      spark.scale.set(size, size, 1);
      spark.userData.baseScale = new THREE.Vector2(size, size);
      spark.userData.baseOpacity = 0.38 + (i % 3) * 0.09;
      spark.userData.orbitRadius = radius;
      spark.userData.orbitAngle = angle;
      spark.userData.orbitSpeed = (i % 2 === 0 ? 1 : -1) * (0.5 + (i % 6) * 0.1);
      spark.userData.phase = i * 0.45;
      portal.add(spark);
      this.globeOrbitalMeshes.push(spark);
    }

    this.group.rotation.set(-0.05, 0.0, -0.015);
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
      this.group.rotation.x = -0.05 + Math.sin(this.elapsed * 0.78) * 0.015;
      this.group.rotation.y = Math.sin(this.elapsed * 0.42) * 0.065;
      this.group.rotation.z += delta * 0.1;

      const pulse = 1 + Math.sin(this.elapsed * 0.95) * 0.015;
      for (const glow of this.globeGlowSprites) {
        const baseScale = glow.userData.baseScale as THREE.Vector2 | undefined;
        if (!baseScale) continue;
        glow.scale.set(baseScale.x * pulse, baseScale.y * pulse, 1);
      }

      for (const orbit of this.globeOrbitalMeshes) {
        const phase = (orbit.userData.phase as number | undefined) ?? 0;
        const spinSpeed = orbit.userData.spinSpeed as number | undefined;
        if (spinSpeed !== undefined) {
          orbit.rotation.z += delta * spinSpeed * 0.8;
        }

        const orbitRadius = orbit.userData.orbitRadius as number | undefined;
        const orbitSpeed = orbit.userData.orbitSpeed as number | undefined;
        if (orbitRadius !== undefined && orbitSpeed !== undefined) {
          orbit.userData.orbitAngle =
            ((orbit.userData.orbitAngle as number | undefined) ?? 0) + delta * orbitSpeed * 0.8;
          const orbitAngle = orbit.userData.orbitAngle as number;
          orbit.position.x = Math.cos(orbitAngle) * orbitRadius;
          orbit.position.y = Math.sin(orbitAngle) * orbitRadius * 0.92;
        }

        const baseY = orbit.userData.baseY as number | undefined;
        const bobAmplitude = orbit.userData.bobAmplitude as number | undefined;
        if (baseY !== undefined && bobAmplitude !== undefined) {
          orbit.position.y = baseY + Math.sin(this.elapsed * 1.24 + phase) * bobAmplitude;
        }

        const materialHolder = orbit as THREE.Object3D & {
          material?: THREE.Material | THREE.Material[];
        };
        const baseOpacity = orbit.userData.baseOpacity as number | undefined;
        if (baseOpacity !== undefined && materialHolder.material) {
          const opacity = THREE.MathUtils.clamp(
            baseOpacity + Math.sin(this.elapsed * 1.35 + phase) * 0.05,
            0,
            1
          );
          const mats = Array.isArray(materialHolder.material)
            ? materialHolder.material
            : [materialHolder.material];
          for (const mat of mats) {
            (mat as THREE.Material & { opacity?: number }).opacity = opacity;
          }
        }

        const baseScale = orbit.userData.baseScale as THREE.Vector2 | undefined;
        if (baseScale) {
          const isSprite = orbit instanceof THREE.Sprite;
          const freq = isSprite ? 1.6 : 0.8;
          const amp = isSprite ? 0.08 : 0.015;
          const flicker = 1 + Math.sin(this.elapsed * freq + phase) * amp;
          orbit.scale.set(baseScale.x * flicker, baseScale.y * flicker, 1);
        }
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
    this.globeOrbitalMeshes = [];
  }
}
