import * as THREE from 'three';

export type IconType = 'key' | 'globe' | 'info' | 'inbox' | 'friends';

const ICON_SIZE = 216; // 108 CSS px * 2 DPR

export class MenuIcon3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Group;
  private type: IconType;
  private ctx: CanvasRenderingContext2D;
  private elapsed = 0;
  private readonly keySpinQuat = new THREE.Quaternion();
  private readonly keyTiltQuat = new THREE.Quaternion();
  private globeCoreGroup: THREE.Group | null = null;
  private globeOrbitalGroup: THREE.Group | null = null;
  private globeAuxPanels: Array<{
    group: THREE.Group;
    baseX: number;
    baseY: number;
    baseZ: number;
    baseRotY: number;
    baseRotZ: number;
    phase: number;
  }> = [];
  private globePulseMaterials: Array<{
    material: THREE.Material;
    baseOpacity: number;
    amplitude: number;
    speed: number;
    phase: number;
  }> = [];
  private globePacketNodes: Array<{
    mesh: THREE.Mesh;
    radiusX: number;
    radiusY: number;
    speed: number;
    phase: number;
    zOffset: number;
  }> = [];
  private static readonly AXIS_Y = new THREE.Vector3(0, 1, 0);
  private static readonly AXIS_Z = new THREE.Vector3(0, 0, 1);

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
      case 'key':
        this.buildKey();
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
      case 'inbox':
        this.buildInboxPlaceholder();
        this.camera.position.set(0, 0, 4.8);
        break;
      case 'friends':
        this.buildFriendsPlaceholder();
        this.camera.position.set(0, 0, 5.0);
        break;
    }

    this.camera.lookAt(0, 0, 0);
  }

  private buildKey(): void {
    const goldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf7c53b,
      emissive: 0xc98b1f,
      emissiveIntensity: 0.44,
      metalness: 0.78,
      roughness: 0.22,
      clearcoat: 0.95,
      clearcoatRoughness: 0.18,
    });
    const deepGoldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdfab24,
      emissive: 0x966115,
      emissiveIntensity: 0.31,
      metalness: 0.66,
      roughness: 0.28,
      clearcoat: 0.85,
      clearcoatRoughness: 0.24,
    });

    // Subtle key-only accents without pushing the icon into neon yellow.
    const keyFillLight = new THREE.PointLight(0xfff3d0, 1.05, 7.5, 2.0);
    keyFillLight.position.set(0.95, 1.1, 1.75);
    this.scene.add(keyFillLight);
    const keyRimLight = new THREE.PointLight(0xffd788, 0.58, 6.5, 2.0);
    keyRimLight.position.set(-1.1, -0.55, -1.15);
    this.scene.add(keyRimLight);

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

    // Mesh-attached halo: no billboards and no post-processing alpha artifacts.
    const keyHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff1cf,
      transparent: true,
      opacity: 0.018,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const baseKeyMeshes = this.group.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);
    for (const baseMesh of baseKeyMeshes) {
      const haloMesh = new THREE.Mesh(baseMesh.geometry.clone(), keyHaloMaterial);
      haloMesh.position.copy(baseMesh.position);
      haloMesh.quaternion.copy(baseMesh.quaternion);
      haloMesh.scale.copy(baseMesh.scale).multiplyScalar(1.02);
      this.group.add(haloMesh);
    }

    // Billboarded golden aura behind the key.
    const keyGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createRadialGlowTexture(
          'rgba(255, 242, 188, 0.96)',
          'rgba(255, 182, 62, 0.5)',
          'rgba(0, 0, 0, 0)'
        ),
        color: 0xffdd98,
        transparent: true,
        opacity: 0.64,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    keyGlow.position.set(0.02, 0.02, -0.56);
    keyGlow.scale.set(3.45, 4.95, 1);
    this.scene.add(keyGlow);

    // Base orientation: key teeth point away from camera.
    this.group.rotation.set(0, Math.PI * 0.5, 0);
  }

  private buildGlobe(): void {
    const radius = 0.92;
    this.globeCoreGroup = null;
    this.globeOrbitalGroup = null;
    this.globeAuxPanels = [];
    this.globePulseMaterials = [];
    this.globePacketNodes = [];

    const PULSE_AMPLITUDE_SCALE = 0.2;
    const PULSE_SPEED_SCALE = 0.35;
    const addPulse = (
      material: THREE.Material,
      baseOpacity: number,
      amplitude: number,
      speed: number,
      phase: number
    ): void => {
      this.globePulseMaterials.push({
        material,
        baseOpacity,
        amplitude: amplitude * PULSE_AMPLITUDE_SCALE,
        speed: speed * PULSE_SPEED_SCALE,
        phase,
      });
    };

    const globeFillLight = new THREE.PointLight(0x6dff80, 0.38, 8.0, 2.0);
    globeFillLight.position.set(1.45, 1.18, 1.52);
    this.scene.add(globeFillLight);

    const globeRimLight = new THREE.PointLight(0xacff7a, 0.24, 7.5, 2.0);
    globeRimLight.position.set(-1.44, 0.14, -1.36);
    this.scene.add(globeRimLight);

    const globeBackLight = new THREE.PointLight(0x46f08a, 0.12, 7.0, 2.0);
    globeBackLight.position.set(0, -1.35, -1.45);
    this.scene.add(globeBackLight);

    const coreGroup = new THREE.Group();
    this.group.add(coreGroup);
    this.globeCoreGroup = coreGroup;

    const coreVolumeMaterial = new THREE.MeshBasicMaterial({
      color: 0x2adb56,
      transparent: true,
      opacity: 0.03,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const coreVolume = new THREE.Mesh(new THREE.SphereGeometry(radius, 34, 24), coreVolumeMaterial);
    coreVolume.scale.z = 0.96;
    coreGroup.add(coreVolume);
    addPulse(coreVolumeMaterial, 0.06, 0.015, 2.2, 0.3);

    const gridCoreTemplate = new THREE.LineBasicMaterial({
      color: 0x8fff7b,
      transparent: true,
      opacity: 0.2,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const gridGlowTemplate = new THREE.LineBasicMaterial({
      color: 0x27ff51,
      transparent: true,
      opacity: 0.04,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });

    const latitudeBands = 8;
    for (let band = 1; band < latitudeBands; band++) {
      const t = band / latitudeBands;
      const lat = (t - 0.5) * Math.PI * 0.92;
      const y = Math.sin(lat) * radius;
      const ringRadius = Math.cos(lat) * radius;
      const points: THREE.Vector3[] = [];
      const segments = 120;
      for (let segment = 0; segment < segments; segment++) {
        const angle = (segment / segments) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(angle) * ringRadius, y, Math.sin(angle) * ringRadius * 0.96)
        );
      }
      const glowMaterial = gridGlowTemplate.clone();
      const coreMaterial = gridCoreTemplate.clone();
      coreGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), glowMaterial));
      coreGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), coreMaterial));
      addPulse(glowMaterial, 0.08, 0.02, 2.3, band * 0.31);
      addPulse(coreMaterial, 0.34, 0.03, 2.9, band * 0.47);
    }

    const longitudeLines = 12;
    for (let line = 0; line < longitudeLines; line++) {
      const lon = (line / longitudeLines) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      const segments = 72;
      for (let segment = 0; segment <= segments; segment++) {
        const lat = -Math.PI * 0.46 + (segment / segments) * Math.PI * 0.92;
        points.push(
          new THREE.Vector3(
            Math.cos(lat) * Math.cos(lon) * radius,
            Math.sin(lat) * radius,
            Math.cos(lat) * Math.sin(lon) * radius * 0.96
          )
        );
      }
      const glowMaterial = gridGlowTemplate.clone();
      const coreMaterial = gridCoreTemplate.clone();
      coreGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), glowMaterial));
      coreGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), coreMaterial));
      addPulse(glowMaterial, 0.08, 0.018, 2.1, line * 0.27);
      addPulse(coreMaterial, 0.34, 0.025, 2.8, line * 0.33);
    }

    const hubAt = (latDeg: number, lonDeg: number, scale = 1): THREE.Vector3 => {
      const lat = (latDeg * Math.PI) / 180;
      const lon = (lonDeg * Math.PI) / 180;
      return new THREE.Vector3(
        Math.cos(lat) * Math.cos(lon) * radius * scale,
        Math.sin(lat) * radius * scale,
        Math.cos(lat) * Math.sin(lon) * radius * 0.96 * scale
      );
    };

    const hubs = [
      hubAt(52, -12),
      hubAt(42, 10),
      hubAt(34, 28),
      hubAt(18, 36),
      hubAt(4, 22),
      hubAt(-8, 28),
      hubAt(-22, 18),
      hubAt(26, -18),
      hubAt(36, -34),
      hubAt(12, -4),
      hubAt(-2, -14),
    ];
    const links: Array<[number, number]> = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [1, 7],
      [7, 8],
      [7, 9],
      [9, 4],
      [10, 4],
      [10, 6],
      [2, 9],
      [0, 8],
    ];

    const hubNodeGeometry = new THREE.SphereGeometry(0.02, 10, 10);
    const hubNodeTemplate = new THREE.MeshBasicMaterial({
      color: 0xd7ffbb,
      transparent: true,
      opacity: 0.34,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    hubs.forEach((hub, index) => {
      const nodeMaterial = hubNodeTemplate.clone();
      const node = new THREE.Mesh(hubNodeGeometry, nodeMaterial);
      node.position.copy(hub);
      coreGroup.add(node);
      addPulse(nodeMaterial, 0.52, 0.04, 3.1, index * 0.36);
    });

    links.forEach(([aIndex, bIndex], index) => {
      const start = hubs[aIndex];
      const end = hubs[bIndex];
      const arcPoints: THREE.Vector3[] = [];
      const segments = 28;
      for (let segment = 0; segment <= segments; segment++) {
        const t = segment / segments;
        const raisedPoint = start.clone().lerp(end, t).normalize();
        const lift = 1 + Math.sin(t * Math.PI) * 0.12;
        arcPoints.push(raisedPoint.multiplyScalar(radius * lift));
      }

      const arcMaterial = new THREE.LineBasicMaterial({
        color: index % 3 === 0 ? 0xb8ff7d : 0x86ff85,
        transparent: true,
        opacity: 0.14,
        blending: THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPoints), arcMaterial);
      coreGroup.add(arc);
      addPulse(arcMaterial, 0.22, 0.04, 2.4 + index * 0.1, index * 0.24);
    });

    const orbitGuidePoints: THREE.Vector3[] = [];
    const orbitSegments = 180;
    for (let i = 0; i < orbitSegments; i++) {
      const angle = (i / orbitSegments) * Math.PI * 2;
      orbitGuidePoints.push(new THREE.Vector3(Math.cos(angle) * radius * 1.22, Math.sin(angle) * radius * 0.76, 0));
    }
    const orbitGuideMaterial = new THREE.LineBasicMaterial({
      color: 0xb4ff79,
      transparent: true,
      opacity: 0.12,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const orbitGuide = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(orbitGuidePoints), orbitGuideMaterial);
    orbitGuide.rotation.set(Math.PI * 0.43, 0.02, -0.08);
    coreGroup.add(orbitGuide);
    addPulse(orbitGuideMaterial, 0.2, 0.03, 2.6, 0.5);

    const orbitBandMaterial = new THREE.MeshBasicMaterial({
      color: 0x7dff6d,
      transparent: true,
      opacity: 0.04,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const orbitBand = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.22, 0.014, 10, 120),
      orbitBandMaterial
    );
    orbitBand.rotation.copy(orbitGuide.rotation);
    coreGroup.add(orbitBand);
    addPulse(orbitBandMaterial, 0.08, 0.02, 2.2, 1.0);

    const orbitTickTemplate = new THREE.LineBasicMaterial({
      color: 0xccff8f,
      transparent: true,
      opacity: 0.18,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    for (let i = 0; i < 8; i++) {
      const angle = -0.96 + i * 0.31;
      const x = Math.cos(angle) * radius * 1.22;
      const y = Math.sin(angle) * radius * 0.76;
      const tickMaterial = orbitTickTemplate.clone();
      const tick = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x * 0.97, y * 0.97, 0),
          new THREE.Vector3(x * 1.05, y * 1.05, 0),
        ]),
        tickMaterial
      );
      tick.rotation.copy(orbitGuide.rotation);
      coreGroup.add(tick);
      addPulse(tickMaterial, 0.28, 0.04, 2.9, i * 0.43);
    }

    const haloMaterial = new THREE.SpriteMaterial({
      map: this.createOffsetGlowTexture(),
      color: 0x57ff72,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.set(3.22, 2.9, 1);
    halo.position.set(-0.1, 0.03, -0.18);
    coreGroup.add(halo);
    addPulse(haloMaterial, 0.14, 0.02, 2.1, 0.7);

    const orbitalGroup = new THREE.Group();
    orbitalGroup.rotation.copy(orbitGuide.rotation);
    coreGroup.add(orbitalGroup);
    this.globeOrbitalGroup = orbitalGroup;

    const packetGeometry = new THREE.SphereGeometry(0.03, 10, 10);
    const packetCount = 10;
    for (let i = 0; i < packetCount; i++) {
      const packetMaterial = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xf4ffbc : 0xc1ff88,
        transparent: true,
        opacity: 0.28,
        blending: THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const packet = new THREE.Mesh(packetGeometry, packetMaterial);
      const phase = (i / packetCount) * Math.PI * 2;
      const radiusX = radius * 1.22;
      const radiusY = radius * 0.76;
      const speed = 0.28 + (i % 4) * 0.06;
      const zOffset = -0.05 + (i % 3) * 0.045;
      packet.position.set(
        Math.cos(phase) * radiusX,
        Math.sin(phase) * radiusY,
        zOffset + Math.sin(phase * 2.2) * 0.05
      );
      orbitalGroup.add(packet);
      this.globePacketNodes.push({
        mesh: packet,
        radiusX,
        radiusY,
        speed,
        phase,
        zOffset,
      });
      addPulse(packetMaterial, 0.45, 0.05, 4.2 + i * 0.2, i * 0.35);
    }

    const createAuxPanel = (
      width: number,
      height: number,
      title: string,
      subtitle: string,
      rows: readonly string[]
    ): THREE.Group => {
      const texture = this.createGlobeAuxTerminalTexture(title, subtitle, rows);
      texture.needsUpdate = true;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const panel = new THREE.Group();

      const mainMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        color: 0xa8ff7a,
        transparent: true,
        opacity: 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      panel.add(new THREE.Mesh(new THREE.PlaneGeometry(width, height), mainMaterial));

      const ghostMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        color: 0x8bff66,
        transparent: true,
        opacity: 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const ghost = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.03, height * 1.03), ghostMaterial);
      ghost.position.set(-0.01, 0.01, -0.01);
      panel.add(ghost);

      const frameMaterial = new THREE.LineBasicMaterial({
        color: 0xc4ff8f,
        transparent: true,
        opacity: 0.34,
        blending: THREE.NormalBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      });
      const frame = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-width * 0.54, height * 0.48, 0.02),
          new THREE.Vector3(width * 0.54, height * 0.48, 0.02),
          new THREE.Vector3(width * 0.54, -height * 0.48, 0.02),
          new THREE.Vector3(-width * 0.54, -height * 0.48, 0.02),
        ]),
        frameMaterial
      );
      panel.add(frame);

      addPulse(mainMaterial, 0.72, 0.07, 4.1, width * 2.1);
      addPulse(ghostMaterial, 0.24, 0.05, 3.5, height * 2.4);
      addPulse(frameMaterial, 0.8, 0.08, 3.2, width + height);

      return panel;
    };

    const rightPanel = createAuxPanel(
      0.58,
      0.74,
      'UPLINK // AFRICA',
      'SECTOR A-17',
      ['NODE CT ........ 219', 'LATENCY ........ 33ms', 'TRAFFIC ........ 81%', 'PACKETS ........ FLOW']
    );
    rightPanel.position.set(1.48, 0.3, 0.1);
    rightPanel.rotation.set(0.02, -0.56, -0.05);
    this.group.add(rightPanel);
    this.globeAuxPanels.push({
      group: rightPanel,
      baseX: 1.48,
      baseY: 0.3,
      baseZ: 0.1,
      baseRotY: -0.56,
      baseRotZ: -0.05,
      phase: 0.2,
    });

    const leftPanel = createAuxPanel(
      0.54,
      0.66,
      'ROUTE // ATLANTIC',
      'SECTOR B-04',
      ['AUTH ........... OK', 'RELAY .......... LIVE', 'THREAT LVL ...... LOW', 'SYNC ............ 99%']
    );
    leftPanel.position.set(-1.5, -0.28, 0.16);
    leftPanel.rotation.set(-0.01, 0.58, 0.07);
    this.group.add(leftPanel);
    this.globeAuxPanels.push({
      group: leftPanel,
      baseX: -1.5,
      baseY: -0.28,
      baseZ: 0.16,
      baseRotY: 0.58,
      baseRotZ: 0.07,
      phase: 1.2,
    });

    const topPanel = createAuxPanel(
      0.42,
      0.46,
      'PINGS // LIVE',
      'SECTOR C-12',
      ['P01 ............. 24ms', 'P02 ............. 28ms', 'P03 ............. 31ms']
    );
    topPanel.position.set(1.22, 0.95, -0.02);
    topPanel.rotation.set(0.03, -0.42, -0.04);
    this.group.add(topPanel);
    this.globeAuxPanels.push({
      group: topPanel,
      baseX: 1.22,
      baseY: 0.95,
      baseZ: -0.02,
      baseRotY: -0.42,
      baseRotZ: -0.04,
      phase: 2.1,
    });

    const connectorTemplate = new THREE.LineBasicMaterial({
      color: 0xb9ff7f,
      transparent: true,
      opacity: 0.16,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const addConnector = (start: THREE.Vector3, end: THREE.Vector3, offsetY: number, phase: number): void => {
      const mid = start.clone().lerp(end, 0.5);
      mid.y += offsetY;
      const connectorMaterial = connectorTemplate.clone();
      const connector = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([start, mid, end]),
        connectorMaterial
      );
      this.group.add(connector);
      addPulse(connectorMaterial, 0.28, 0.04, 3.1, phase);
    };

    addConnector(hubAt(22, 18, 1.03), new THREE.Vector3(1.18, 0.34, 0.12), 0.08, 0.4);
    addConnector(hubAt(-6, 22, 1.02), new THREE.Vector3(1.12, 0.18, 0.16), 0.04, 0.9);
    addConnector(hubAt(12, -8, 1.02), new THREE.Vector3(-1.16, -0.2, 0.18), -0.02, 1.5);
    addConnector(hubAt(42, 14, 1.01), new THREE.Vector3(1.0, 0.86, 0), 0.16, 2.0);

    const connectorNodeMaterial = new THREE.MeshBasicMaterial({
      color: 0xecffb8,
      transparent: true,
      opacity: 0.3,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const connectorNodeGeometry = new THREE.SphereGeometry(0.015, 10, 10);
    const connectorNodePoints = [
      new THREE.Vector3(1.18, 0.34, 0.12),
      new THREE.Vector3(1.12, 0.18, 0.16),
      new THREE.Vector3(-1.16, -0.2, 0.18),
      new THREE.Vector3(1.0, 0.86, 0),
    ];
    connectorNodePoints.forEach((point, index) => {
      const markerMaterial = connectorNodeMaterial.clone();
      const marker = new THREE.Mesh(connectorNodeGeometry, markerMaterial);
      marker.position.copy(point);
      this.group.add(marker);
      addPulse(markerMaterial, 0.56, 0.05, 3.4, index * 0.52);
    });

    this.group.rotation.set(-0.18, 0.46, 0.04);
  }

  private buildInboxPlaceholder(): void {
    const texture = this.createMailEnvelopeTexture();
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const createRoundedRectShape = (width: number, height: number, radius: number): THREE.Shape => {
      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const r = Math.min(radius, halfW, halfH);
      const shape = new THREE.Shape();
      shape.moveTo(-halfW + r, -halfH);
      shape.lineTo(halfW - r, -halfH);
      shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r);
      shape.lineTo(halfW, halfH - r);
      shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH);
      shape.lineTo(-halfW + r, halfH);
      shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r);
      shape.lineTo(-halfW, -halfH + r);
      shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH);
      shape.closePath();
      return shape;
    };

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.08,
      metalness: 0.0,
      roughness: 0.15,
      transmission: 0.0,
      thickness: 0.22,
      ior: 1.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: false,
      opacity: 1.0,
    });
    const faceMaterial = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.09,
      metalness: 0.0,
      roughness: 0.13,
      transmission: 0.0,
      thickness: 0.16,
      ior: 1.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide,
    });
    const flapTopMaterial = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.06,
      metalness: 0.0,
      roughness: 0.18,
      transmission: 0.0,
      thickness: 0.14,
      ior: 1.33,
      clearcoat: 0.95,
      clearcoatRoughness: 0.09,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide,
    });
    const flapEdgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.05,
      metalness: 0.0,
      roughness: 0.24,
      transmission: 0.0,
      thickness: 0.12,
      ior: 1.31,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      transparent: false,
      opacity: 1.0,
    });
    const foldRidgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.64,
    });
    const foldShadowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    const mailFillLight = new THREE.PointLight(0xfff8ec, 0.4, 6.5, 2.0);
    mailFillLight.position.set(1.05, 0.92, 1.55);
    this.scene.add(mailFillLight);
    const mailRimLight = new THREE.PointLight(0xfff0d8, 0.14, 5.6, 2.0);
    mailRimLight.position.set(-1.0, -0.42, -0.95);
    this.scene.add(mailRimLight);
    const mailEdgeLight = new THREE.PointLight(0x2e7dff, 0.34, 6.2, 2.0);
    mailEdgeLight.position.set(0.02, 0.2, 1.55);
    this.scene.add(mailEdgeLight);
    const mailBackGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createRadialGlowTexture(
          'rgba(241, 249, 255, 0.94)',
          'rgba(84, 147, 255, 0.5)',
          'rgba(0, 0, 0, 0)'
        ),
        color: 0x72a8ff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mailBackGlow.position.set(0.0, 0.0, -0.56);
    mailBackGlow.scale.set(3.24, 2.56, 1);
    this.scene.add(mailBackGlow);

    const bodyGeometry = new THREE.ExtrudeGeometry(createRoundedRectShape(2.06, 1.4, 0.22), {
      depth: 0.23,
      bevelEnabled: true,
      bevelSize: 0.055,
      bevelThickness: 0.05,
      bevelSegments: 4,
      curveSegments: 20,
    });
    bodyGeometry.translate(0, 0, -0.115);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, -0.045, 0);
    this.group.add(body);

    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0x97bbff,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      toneMapped: false,
    });
    const glowOutlineMaterial = new THREE.LineBasicMaterial({
      color: 0xd9e8ff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    const bodyOutline = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeometry, 22), outlineMaterial);
    bodyOutline.position.copy(body.position);
    this.group.add(bodyOutline);

    const bodyOutlineGlow = new THREE.LineSegments(
      new THREE.EdgesGeometry(bodyGeometry, 22),
      glowOutlineMaterial
    );
    bodyOutlineGlow.position.copy(body.position);
    bodyOutlineGlow.scale.setScalar(1.014);
    this.group.add(bodyOutlineGlow);

    const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(1.94, 1.34), faceMaterial);
    frontFace.position.set(0, -0.03, 0.138);
    this.group.add(frontFace);

    const flapShape = new THREE.Shape();
    flapShape.moveTo(-0.99, 0.56);
    flapShape.lineTo(0.99, 0.56);
    flapShape.lineTo(0, -0.16);
    flapShape.lineTo(-0.99, 0.56);
    flapShape.closePath();
    const flapGeometry = new THREE.ExtrudeGeometry(flapShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelSize: 0.006,
      bevelThickness: 0.005,
      bevelSegments: 2,
      curveSegments: 24,
    });
    flapGeometry.translate(0, 0, -0.009);
    const flap = new THREE.Mesh(flapGeometry, [flapTopMaterial, flapEdgeMaterial]);
    flap.position.set(0, 0.09, 0.158);
    flap.rotation.x = -0.012;
    this.group.add(flap);

    const createFoldRidge = (
      parent: THREE.Object3D,
      start: THREE.Vector3,
      end: THREE.Vector3
    ): void => {
      const direction = end.clone().sub(start);
      const length = direction.length();
      const ridge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0038, 0.0038, length, 12),
        foldRidgeMaterial
      );
      ridge.position.copy(start).add(end).multiplyScalar(0.5);
      ridge.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
      );
      parent.add(ridge);
    };

    createFoldRidge(
      flap,
      new THREE.Vector3(-0.97, 0.54, 0.0105),
      new THREE.Vector3(0, -0.15, 0.0105)
    );
    createFoldRidge(
      flap,
      new THREE.Vector3(0.97, 0.54, 0.0105),
      new THREE.Vector3(0, -0.15, 0.0105)
    );

    const foldShadowShape = new THREE.Shape();
    foldShadowShape.moveTo(-0.95, 0.52);
    foldShadowShape.lineTo(0.95, 0.52);
    foldShadowShape.lineTo(0, -0.13);
    foldShadowShape.closePath();
    const foldShadow = new THREE.Mesh(new THREE.ShapeGeometry(foldShadowShape), foldShadowMaterial);
    foldShadow.position.set(0, 0, -0.011);
    flap.add(foldShadow);

    this.group.rotation.set(-0.16, 0.08, -0.23);
    this.group.scale.setScalar(0.9);
  }

  private createMailEnvelopeTexture(): THREE.CanvasTexture {
    const width = 768;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const hash = (seed: number): number => {
      const value = Math.sin(seed * 93.37 + 17.43) * 43758.5453123;
      return value - Math.floor(value);
    };

    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, '#ffffff');
    base.addColorStop(0.5, '#f8fbff');
    base.addColorStop(1, '#eef5ff');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const highlight = ctx.createRadialGradient(width * 0.4, height * 0.17, 20, width * 0.54, height * 0.3, 320);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.68)');
    highlight.addColorStop(0.6, 'rgba(241, 248, 255, 0.26)');
    highlight.addColorStop(1, 'rgba(241, 248, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.fillRect(0, 0, width, height);

    const lowerShade = ctx.createLinearGradient(0, height * 0.36, 0, height);
    lowerShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    lowerShade.addColorStop(1, 'rgba(88, 116, 150, 0.018)');
    ctx.fillStyle = lowerShade;
    ctx.fillRect(0, 0, width, height);

    const sideShade = ctx.createLinearGradient(0, 0, width, 0);
    sideShade.addColorStop(0, 'rgba(104, 131, 161, 0.006)');
    sideShade.addColorStop(0.2, 'rgba(92, 118, 146, 0)');
    sideShade.addColorStop(0.78, 'rgba(92, 118, 146, 0)');
    sideShade.addColorStop(1, 'rgba(104, 131, 161, 0.007)');
    ctx.fillStyle = sideShade;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 60; i++) {
      const x = hash(i + 11) * width;
      const y = hash(i + 31) * height;
      const size = 0.5 + hash(i + 53) * 0.9;
      const alpha = 0.00012 + hash(i + 79) * 0.00035;
      ctx.fillStyle = `rgba(122, 146, 174, ${alpha})`;
      ctx.fillRect(x, y, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private buildFriendsPlaceholder(): void {
    const createRoundedRectShape = (width: number, height: number, radius: number): THREE.Shape => {
      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const r = Math.min(radius, halfW, halfH);
      const shape = new THREE.Shape();
      shape.moveTo(-halfW + r, -halfH);
      shape.lineTo(halfW - r, -halfH);
      shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r);
      shape.lineTo(halfW, halfH - r);
      shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH);
      shape.lineTo(-halfW + r, halfH);
      shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r);
      shape.lineTo(-halfW, -halfH + r);
      shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH);
      shape.closePath();
      return shape;
    };

    const createRoundedPanel = (
      width: number,
      height: number,
      depth: number,
      radius: number,
      material: THREE.Material
    ): THREE.Mesh => {
      const geometry = new THREE.ExtrudeGeometry(createRoundedRectShape(width, height, radius), {
        depth,
        bevelEnabled: true,
        bevelSize: Math.min(radius * 0.32, depth * 0.46),
        bevelThickness: Math.min(radius * 0.32, depth * 0.42),
        bevelSegments: 2,
        curveSegments: 10,
      });
      geometry.translate(0, 0, -depth * 0.5);
      return new THREE.Mesh(geometry, material);
    };

    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf3e6cc,
      emissive: 0x17120d,
      emissiveIntensity: 0.03,
      metalness: 0.1,
      roughness: 0.44,
      clearcoat: 0.7,
      clearcoatRoughness: 0.28,
    });
    const shellInsetMaterial = new THREE.MeshStandardMaterial({
      color: 0xe7dac2,
      metalness: 0.08,
      roughness: 0.52,
    });
    const bezelMaterial = new THREE.MeshStandardMaterial({
      color: 0x182547,
      emissive: 0x0b1430,
      emissiveIntensity: 0.22,
      metalness: 0.18,
      roughness: 0.32,
    });
    const keyboardDeckMaterial = new THREE.MeshStandardMaterial({
      color: 0x0e1a34,
      emissive: 0x050b1b,
      emissiveIntensity: 0.16,
      metalness: 0.18,
      roughness: 0.44,
    });
    const keycapMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a4377,
      emissive: 0x122753,
      emissiveIntensity: 0.22,
      metalness: 0.12,
      roughness: 0.34,
    });
    const keyFaceMaterial = new THREE.MeshStandardMaterial({
      color: 0x8daee4,
      emissive: 0x2f548f,
      emissiveIntensity: 0.14,
      metalness: 0.06,
      roughness: 0.42,
    });
    const keyHighlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x4f74c3,
      emissive: 0x26478d,
      emissiveIntensity: 0.28,
      metalness: 0.16,
      roughness: 0.33,
    });
    const keyAccentFaceMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6e4ff,
      emissive: 0x4f7dcc,
      emissiveIntensity: 0.2,
      metalness: 0.05,
      roughness: 0.45,
    });
    const trackpadMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f1a32,
      emissive: 0x090f1e,
      emissiveIntensity: 0.22,
      metalness: 0.12,
      roughness: 0.48,
    });
    const accentOrangeMaterial = new THREE.MeshStandardMaterial({
      color: 0x4e86ff,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      metalness: 0.12,
      roughness: 0.3,
    });
    const accentSteelMaterial = new THREE.MeshStandardMaterial({
      color: 0x8590a2,
      metalness: 0.3,
      roughness: 0.34,
    });
    const indicatorWhiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xf7fbff,
      emissive: 0xc7dcff,
      emissiveIntensity: 0.9,
      metalness: 0.04,
      roughness: 0.24,
    });
    const indicatorBlueMaterial = new THREE.MeshStandardMaterial({
      color: 0x64a0ff,
      emissive: 0x2d73ff,
      emissiveIntensity: 1.2,
      metalness: 0.06,
      roughness: 0.22,
    });
    const dpadCenterIndicatorMaterial = new THREE.MeshStandardMaterial({
      color: 0x9ec4ff,
      emissive: 0x4b8dff,
      emissiveIntensity: 2.2,
      metalness: 0.04,
      roughness: 0.18,
    });
    const screwMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b1227,
      metalness: 0.18,
      roughness: 0.46,
    });
    const whiteIndicatorGlowMap = this.createRadialGlowTexture(
      'rgba(255, 255, 255, 0.98)',
      'rgba(188, 215, 255, 0.4)',
      'rgba(0, 0, 0, 0)'
    );
    const blueIndicatorGlowMap = this.createRadialGlowTexture(
      'rgba(186, 216, 255, 0.98)',
      'rgba(62, 129, 255, 0.56)',
      'rgba(0, 0, 0, 0)'
    );

    const addIndicatorGlow = (
      map: THREE.Texture,
      color: THREE.ColorRepresentation,
      x: number,
      y: number,
      z: number,
      scaleX: number,
      scaleY: number,
      opacity: number
    ): void => {
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map,
          color,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
          toneMapped: false,
        })
      );
      glow.position.set(x, y, z);
      glow.scale.set(scaleX, scaleY, 1);
      this.group.add(glow);
    };

    const shellFill = new THREE.PointLight(0xfff2d5, 0.55, 7.2, 2.0);
    shellFill.position.set(1.15, 1.24, 1.75);
    this.scene.add(shellFill);
    const shellRim = new THREE.PointLight(0xa8beff, 0.24, 6.1, 2.0);
    shellRim.position.set(-1.1, -0.45, -1.1);
    this.scene.add(shellRim);

    // Top display unit.
    const topShell = createRoundedPanel(2.06, 1.06, 0.15, 0.14, shellMaterial);
    topShell.position.set(0, 0.58, -0.01);
    this.group.add(topShell);

    const topInset = createRoundedPanel(1.9, 0.92, 0.028, 0.1, shellInsetMaterial);
    topInset.position.set(0, 0.59, 0.075);
    this.group.add(topInset);

    const screenBezel = createRoundedPanel(1.72, 0.76, 0.048, 0.1, bezelMaterial);
    screenBezel.position.set(0, 0.64, 0.102);
    this.group.add(screenBezel);

    const screenTexture = this.createPhoneScreenTexture();
    screenTexture.needsUpdate = true;
    screenTexture.minFilter = THREE.LinearFilter;
    screenTexture.magFilter = THREE.LinearFilter;
    screenTexture.anisotropy = 2;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.58, 0.66),
      new THREE.MeshBasicMaterial({
        map: screenTexture,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    screen.position.set(0, 0.64, 0.13);
    screen.rotation.y = Math.PI;
    screen.renderOrder = 20;
    const screenMaterial = screen.material as THREE.MeshBasicMaterial;
    screenMaterial.depthTest = false;
    screenMaterial.depthWrite = false;
    this.group.add(screen);

    // Speaker grille + controls under the top screen.
    const speakerPanel = createRoundedPanel(0.58, 0.12, 0.02, 0.05, shellInsetMaterial);
    speakerPanel.position.set(-0.64, 0.06, 0.1);
    this.group.add(speakerPanel);

    for (let i = 0; i < 7; i++) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.016), bezelMaterial);
      slot.position.set(-0.79 + i * 0.072, 0.06, 0.108);
      this.group.add(slot);
    }

    const rightControlBase = createRoundedPanel(0.42, 0.12, 0.024, 0.05, shellInsetMaterial);
    rightControlBase.position.set(0.69, 0.06, 0.1);
    this.group.add(rightControlBase);

    const greyButton = createRoundedPanel(0.17, 0.08, 0.03, 0.03, indicatorWhiteMaterial);
    greyButton.position.set(0.62, 0.06, 0.112);
    this.group.add(greyButton);
    addIndicatorGlow(whiteIndicatorGlowMap, 0xf3f8ff, 0.62, 0.06, 0.145, 0.2, 0.14, 0.38);

    const orangeButton = createRoundedPanel(0.11, 0.08, 0.03, 0.03, indicatorBlueMaterial);
    orangeButton.position.set(0.8, 0.06, 0.112);
    this.group.add(orangeButton);
    addIndicatorGlow(blueIndicatorGlowMap, 0x73adff, 0.8, 0.06, 0.145, 0.18, 0.14, 0.5);

    const screwGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.012, 14);
    const topLeftScrew = new THREE.Mesh(screwGeo, screwMaterial);
    topLeftScrew.rotation.x = Math.PI * 0.5;
    topLeftScrew.position.set(-0.98, 0.06, 0.108);
    this.group.add(topLeftScrew);
    const topRightScrew = new THREE.Mesh(screwGeo, screwMaterial);
    topRightScrew.rotation.x = Math.PI * 0.5;
    topRightScrew.position.set(0.98, 0.06, 0.108);
    this.group.add(topRightScrew);

    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 1.76, 24), shellInsetMaterial);
    hinge.rotation.z = Math.PI * 0.5;
    hinge.position.set(0, -0.03, 0.01);
    this.group.add(hinge);

    // Bottom keyboard/control deck.
    const bottomShell = createRoundedPanel(2.06, 1.12, 0.18, 0.14, shellMaterial);
    bottomShell.position.set(0, -0.58, -0.02);
    this.group.add(bottomShell);

    const bottomInset = createRoundedPanel(1.9, 0.96, 0.03, 0.1, shellInsetMaterial);
    bottomInset.position.set(0, -0.58, 0.084);
    this.group.add(bottomInset);

    const keyboardWell = createRoundedPanel(1.36, 0.82, 0.03, 0.08, bezelMaterial);
    keyboardWell.position.set(-0.38, -0.58, 0.11);
    this.group.add(keyboardWell);

    const keyboardDeck = createRoundedPanel(1.24, 0.7, 0.016, 0.07, keyboardDeckMaterial);
    keyboardDeck.position.set(-0.38, -0.58, 0.132);
    this.group.add(keyboardDeck);

    const keyBodyGeometry = new THREE.BoxGeometry(0.084, 0.06, 0.024);
    const keyFaceGeometry = new THREE.BoxGeometry(0.056, 0.034, 0.01);
    const keyCols = 12;
    const keyRows = 5;
    const keyStartX = -0.96;
    const keyStepX = 0.11;
    const keyStartY = -0.36;
    const keyStepY = 0.1;
    for (let row = 0; row < keyRows; row++) {
      const rowShift = row % 2 === 0 ? 0 : 0.018;
      for (let col = 0; col < keyCols; col++) {
        const isAccent =
          (row === 0 && col < 3) ||
          (row === 0 && col > 8) ||
          (row === 4 && col > 8) ||
          (row === 3 && col >= 8 && col <= 9);
        const key = new THREE.Mesh(keyBodyGeometry, isAccent ? keyHighlightMaterial : keycapMaterial);
        key.position.set(keyStartX + col * keyStepX + rowShift, keyStartY - row * keyStepY, 0.145);
        key.rotation.z = ((row + col) % 2 === 0 ? 1 : -1) * 0.025;
        this.group.add(key);

        const keyFace = new THREE.Mesh(
          keyFaceGeometry,
          isAccent ? keyAccentFaceMaterial : keyFaceMaterial
        );
        keyFace.position.set(key.position.x, key.position.y + 0.0015, key.position.z + 0.012);
        keyFace.rotation.z = key.rotation.z * 0.7;
        this.group.add(keyFace);
      }
    }

    const spaceBar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.055, 0.026), keycapMaterial);
    spaceBar.position.set(-0.35, -0.86, 0.146);
    this.group.add(spaceBar);
    const spaceBarFace = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.028, 0.01), keyFaceMaterial);
    spaceBarFace.position.set(-0.35, -0.858, 0.159);
    this.group.add(spaceBarFace);

    const controlCluster = createRoundedPanel(0.62, 0.94, 0.028, 0.1, bezelMaterial);
    controlCluster.position.set(0.55, -0.66, 0.114);
    this.group.add(controlCluster);

    const trackpadFrame = createRoundedPanel(0.44, 0.56, 0.03, 0.09, keyboardDeckMaterial);
    trackpadFrame.position.set(0.55, -0.56, 0.132);
    this.group.add(trackpadFrame);

    const trackpad = createRoundedPanel(0.34, 0.46, 0.018, 0.07, trackpadMaterial);
    trackpad.position.set(0.55, -0.56, 0.149);
    this.group.add(trackpad);

    const trackpadSheen = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.38, 0.006), keyFaceMaterial);
    trackpadSheen.position.set(0.69, -0.56, 0.158);
    this.group.add(trackpadSheen);

    const trackpadDivider = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.012, 0.006), keycapMaterial);
    trackpadDivider.position.set(0.55, -0.73, 0.157);
    this.group.add(trackpadDivider);

    const dpadNest = createRoundedPanel(0.32, 0.24, 0.024, 0.07, keyboardDeckMaterial);
    dpadNest.position.set(0.55, -0.9, 0.128);
    this.group.add(dpadNest);

    const dpadBase = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.026, 16), keycapMaterial);
    dpadBase.rotation.x = Math.PI * 0.5;
    dpadBase.position.set(0.55, -0.9, 0.145);
    this.group.add(dpadBase);

    const dpadVertical = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.022), keyHighlightMaterial);
    dpadVertical.position.set(0.55, -0.9, 0.156);
    this.group.add(dpadVertical);
    const dpadHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.022), keyHighlightMaterial);
    dpadHorizontal.position.set(0.55, -0.9, 0.156);
    this.group.add(dpadHorizontal);
    const dpadCenter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.012, 12),
      dpadCenterIndicatorMaterial
    );
    dpadCenter.rotation.x = Math.PI * 0.5;
    dpadCenter.position.set(0.55, -0.9, 0.168);
    this.group.add(dpadCenter);
    addIndicatorGlow(blueIndicatorGlowMap, 0xa8cbff, 0.55, -0.9, 0.188, 0.26, 0.26, 0.82);

    const leftAction = createRoundedPanel(0.07, 0.12, 0.016, 0.03, keycapMaterial);
    leftAction.position.set(0.37, -0.9, 0.141);
    this.group.add(leftAction);
    const rightAction = createRoundedPanel(0.07, 0.12, 0.016, 0.03, keycapMaterial);
    rightAction.position.set(0.73, -0.9, 0.141);
    this.group.add(rightAction);

    const confirmButton = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.028, 20), accentSteelMaterial);
    confirmButton.rotation.x = Math.PI * 0.5;
    confirmButton.position.set(0.98, -0.9, 0.15);
    this.group.add(confirmButton);
    const confirmButtonFace = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 14), keyFaceMaterial);
    confirmButtonFace.rotation.x = Math.PI * 0.5;
    confirmButtonFace.position.set(0.98, -0.9, 0.161);
    this.group.add(confirmButtonFace);

    const bottomLeftScrew = new THREE.Mesh(screwGeo, screwMaterial);
    bottomLeftScrew.rotation.x = Math.PI * 0.5;
    bottomLeftScrew.position.set(-0.98, -0.86, 0.108);
    this.group.add(bottomLeftScrew);
    const bottomRightIndicator = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 16), indicatorWhiteMaterial);
    bottomRightIndicator.rotation.x = Math.PI * 0.5;
    bottomRightIndicator.position.set(0.98, -0.86, 0.112);
    this.group.add(bottomRightIndicator);
    addIndicatorGlow(whiteIndicatorGlowMap, 0xeaf3ff, 0.98, -0.86, 0.136, 0.14, 0.14, 0.42);

    this.group.rotation.set(-0.12, 0.3, 0.02);
    this.group.scale.setScalar(0.92);
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

  private createOffsetGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(92, 96, 0, 126, 128, 142);
    gradient.addColorStop(0, 'rgba(194, 255, 216, 0.94)');
    gradient.addColorStop(0.32, 'rgba(76, 255, 149, 0.64)');
    gradient.addColorStop(0.68, 'rgba(26, 176, 89, 0.22)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createGlobeAuxTerminalTexture(
    title: string,
    subtitle: string,
    rows: readonly string[]
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 380;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    const roundedRectPath = (x: number, y: number, w: number, h: number, r: number): void => {
      const radius = Math.min(r, w * 0.5, h * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    ctx.clearRect(0, 0, width, height);

    roundedRectPath(10, 12, width - 20, height - 24, 14);
    ctx.fillStyle = 'rgba(6, 44, 18, 0.08)';
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(98, 255, 169, 0.92)';
    ctx.shadowColor = 'rgba(92, 255, 168, 0.88)';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.7;
    roundedRectPath(10, 12, width - 20, height - 24, 14);
    ctx.stroke();
    ctx.restore();

    roundedRectPath(16, 18, width - 32, height - 36, 10);
    ctx.strokeStyle = 'rgba(124, 255, 188, 0.34)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    roundedRectPath(18, 20, width - 36, height - 40, 10);
    ctx.clip();

    const coreGlow = ctx.createRadialGradient(width * 0.42, height * 0.4, 6, width * 0.42, height * 0.4, 160);
    coreGlow.addColorStop(0, 'rgba(78, 255, 164, 0.26)');
    coreGlow.addColorStop(0.58, 'rgba(20, 142, 80, 0.1)');
    coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreGlow;
    ctx.fillRect(0, 0, width, height);

    for (let y = 24; y < height - 22; y += 3) {
      const alpha = y % 9 === 0 ? 0.14 : 0.06;
      ctx.fillStyle = `rgba(123, 255, 188, ${alpha})`;
      ctx.fillRect(20, y, width - 40, 1);
    }

    ctx.fillStyle = 'rgba(186, 255, 137, 0.92)';
    ctx.font = '600 16px "Courier New", monospace';
    ctx.fillText(title, 24, 40);
    ctx.fillText(subtitle, 24, 58);

    ctx.strokeStyle = 'rgba(106, 255, 176, 0.8)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(24, 68);
    ctx.lineTo(width - 24, 68);
    ctx.stroke();

    ctx.font = '600 12px "Courier New", monospace';
    rows.forEach((row, i) => {
      ctx.fillStyle = `rgba(174, 255, 132, ${0.88 - i * 0.06})`;
      ctx.fillText(row, 24, 94 + i * 20);
    });

    for (let i = 0; i < 16; i++) {
      const barY = 86 + i * 17;
      const barW = 12 + ((i * 19) % 30);
      ctx.fillStyle = 'rgba(94, 255, 168, 0.34)';
      ctx.fillRect(width - 64, barY, barW, 3);
    }

    for (let i = 0; i < 120; i++) {
      const x = 18 + ((i * 53) % (width - 36));
      const y = 20 + ((i * 73) % (height - 40));
      const alpha = 0.03 + (((i * 11) % 10) / 10) * 0.05;
      ctx.fillStyle = `rgba(132, 255, 196, ${alpha.toFixed(2)})`;
      ctx.fillRect(x, y, 1, 1);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const sweepY = 90 + i * 92;
      const band = ctx.createLinearGradient(0, sweepY - 5, 0, sweepY + 5);
      band.addColorStop(0, 'rgba(0, 0, 0, 0)');
      band.addColorStop(0.5, 'rgba(140, 255, 205, 0.24)');
      band.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = band;
      ctx.fillRect(18, sweepY - 6, width - 36, 12);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createPhoneScreenTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const topBarHeight = Math.round(height * 0.14);
    const topBar = ctx.createLinearGradient(0, 0, 0, topBarHeight);
    topBar.addColorStop(0, '#eef4ff');
    topBar.addColorStop(1, '#dfe9ff');
    ctx.fillStyle = topBar;
    ctx.fillRect(0, 0, width, topBarHeight);

    ctx.fillStyle = '#233a63';
    ctx.font = `700 ${Math.round(height * 0.07)}px sans-serif`;
    ctx.fillText('FriendLink', 22, Math.round(topBarHeight * 0.72));

    // Small reception bars in the top-right of the device screen.
    const signalBaseX = width - 84;
    const signalBaseY = Math.round(topBarHeight * 0.82);
    const signalBarWidth = 8;
    const signalGap = 4;
    for (let i = 0; i < 4; i++) {
      const barHeight = 8 + i * 5;
      ctx.fillStyle = i === 3 ? '#2d73ff' : 'rgba(35, 58, 99, 0.82)';
      ctx.fillRect(
        signalBaseX + i * (signalBarWidth + signalGap),
        signalBaseY - barHeight,
        signalBarWidth,
        barHeight
      );
    }
    ctx.fillStyle = 'rgba(35, 58, 99, 0.82)';
    ctx.beginPath();
    ctx.arc(signalBaseX - 9, signalBaseY - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const smileX = Math.round(width * 0.5);
    const smileY = Math.round(height * 0.58);
    const smileR = Math.round(height * 0.32);

    const faceHighlight = ctx.createRadialGradient(
      smileX - smileR * 0.56,
      smileY - smileR * 0.58,
      smileR * 0.08,
      smileX,
      smileY,
      smileR
    );
    faceHighlight.addColorStop(0, '#fffcb1');
    faceHighlight.addColorStop(0.4, '#f6f547');
    faceHighlight.addColorStop(1, '#f0f100');
    ctx.fillStyle = faceHighlight;
    ctx.beginPath();
    ctx.arc(smileX, smileY, smileR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(
      smileX - smileR * 0.34,
      smileY - smileR * 0.3,
      smileR * 0.115,
      smileR * 0.2,
      0,
      0,
      Math.PI * 2
    );
    ctx.ellipse(
      smileX + smileR * 0.34,
      smileY - smileR * 0.3,
      smileR * 0.115,
      smileR * 0.2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(8, Math.round(smileR * 0.16));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(smileX, smileY + smileR * 0.06, smileR * 0.53, 0.18, Math.PI - 0.18);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
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
    renderer.setClearColor(0x000000, 0);

    if (this.type === 'globe') {
      // Keep auxiliary terminal screens non-spinning; apply only a soft bob + wobble.
      this.group.rotation.set(-0.18, 0.46, 0.04);
      this.group.position.set(0, Math.sin(this.elapsed * 1.1) * 0.042, 0);
      this.group.scale.set(1, 1, 1);

      if (this.globeCoreGroup) {
        this.globeCoreGroup.position.x = Math.sin(this.elapsed * 0.5) * 0.02;
        this.globeCoreGroup.position.y = Math.sin(this.elapsed * 0.82) * 0.032;
        this.globeCoreGroup.position.z = Math.sin(this.elapsed * 0.42) * 0.014;
        this.globeCoreGroup.rotation.y = this.elapsed * 0.08;
        this.globeCoreGroup.rotation.x = Math.sin(this.elapsed * 0.26) * 0.04;
        this.globeCoreGroup.rotation.z = Math.sin(this.elapsed * 0.34) * 0.034;
      }

      if (this.globeOrbitalGroup) {
        this.globeOrbitalGroup.rotation.y = Math.sin(this.elapsed * 0.22) * 0.08;
        this.globeOrbitalGroup.rotation.z = -0.08 + Math.sin(this.elapsed * 0.28) * 0.05;
      }

      for (let i = 0; i < this.globePacketNodes.length; i++) {
        const packet = this.globePacketNodes[i];
        const angle = this.elapsed * packet.speed + packet.phase;
        packet.mesh.position.set(
          Math.cos(angle) * packet.radiusX,
          Math.sin(angle) * packet.radiusY,
          packet.zOffset + Math.sin(angle * 2.2) * 0.05
        );
        const packetScale = 0.86 + (Math.sin(angle * 3.1) + 1) * 0.11;
        packet.mesh.scale.set(packetScale, packetScale, packetScale);
      }

      for (let i = 0; i < this.globeAuxPanels.length; i++) {
        const panel = this.globeAuxPanels[i];
        panel.group.position.set(
          panel.baseX + Math.sin(this.elapsed * 0.68 + panel.phase) * 0.014,
          panel.baseY + Math.sin(this.elapsed * 1.06 + panel.phase) * 0.026,
          panel.baseZ + Math.sin(this.elapsed * 0.57 + panel.phase) * 0.009
        );
        panel.group.rotation.y = panel.baseRotY + Math.sin(this.elapsed * 0.42 + panel.phase) * 0.024;
        panel.group.rotation.z = panel.baseRotZ + Math.sin(this.elapsed * 0.54 + panel.phase) * 0.012;
      }

      for (let i = 0; i < this.globePulseMaterials.length; i++) {
        const pulse = this.globePulseMaterials[i];
        const nextOpacity =
          pulse.baseOpacity +
          Math.sin(this.elapsed * pulse.speed + pulse.phase) * pulse.amplitude;
        pulse.material.opacity = THREE.MathUtils.clamp(nextOpacity, 0.01, 0.6);
      }
    } else if (this.type === 'key') {
      // Continuous full rotation so the key completes 360-degree spins.
      const spinY = this.elapsed * 1.05 + Math.PI * 0.5;
      const rightTilt = -0.14;
      const pulse = 1 + Math.sin(this.elapsed * 2.0) * 0.03;
      const spinQuat = this.keySpinQuat.setFromAxisAngle(MenuIcon3D.AXIS_Y, spinY);
      const tiltQuat = this.keyTiltQuat.setFromAxisAngle(MenuIcon3D.AXIS_Z, rightTilt);
      // Apply spin first, then a fixed screen-space right tilt.
      this.group.quaternion.copy(tiltQuat).multiply(spinQuat);
      this.group.position.set(0, 0, 0);
      this.group.scale.set(pulse, pulse, pulse);
    } else if (this.type === 'info') {
      this.group.rotation.y += delta * 1.0;
      this.group.rotation.x = -0.45 + Math.sin(this.elapsed * 0.9) * 0.05;
      this.group.rotation.z = -0.08 + Math.sin(this.elapsed * 0.8) * 0.03;
      this.group.position.y = Math.sin(this.elapsed * 1.4) * 0.03;
    } else if (this.type === 'inbox') {
      // Match friends-style floating sway while keeping envelope base orientation.
      this.group.rotation.x = -0.1 + Math.sin(this.elapsed * 0.9) * 0.038;
      this.group.rotation.y = 0.04 + Math.sin(this.elapsed * 0.55) * 0.14;
      this.group.rotation.z = -0.09 + Math.sin(this.elapsed * 0.7) * 0.048;
      this.group.position.x = Math.sin(this.elapsed * 0.62) * 0.014;
      this.group.position.y = Math.sin(this.elapsed * 1.3) * 0.022;
      this.group.position.z = Math.sin(this.elapsed * 0.48) * 0.01;
    } else if (this.type === 'friends') {
      this.group.rotation.x = -0.04 + Math.sin(this.elapsed * 0.9) * 0.03;
      this.group.rotation.y = 0.2 + Math.sin(this.elapsed * 0.55) * 0.12;
      this.group.rotation.z = 0.01 + Math.sin(this.elapsed * 0.7) * 0.02;
      this.group.position.y = Math.sin(this.elapsed * 1.3) * 0.02;
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
    });

    this.globeCoreGroup = null;
    this.globeOrbitalGroup = null;
    this.globeAuxPanels = [];
    this.globePulseMaterials = [];
    this.globePacketNodes = [];
  }
}
