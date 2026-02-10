import * as THREE from 'three';

export interface GlobeAuxPanel {
  group: THREE.Group;
  baseX: number;
  baseY: number;
  baseZ: number;
  baseRotY: number;
  baseRotZ: number;
  phase: number;
}

export interface GlobePulseMaterial {
  material: THREE.Material;
  baseOpacity: number;
  amplitude: number;
  speed: number;
  phase: number;
}

export interface GlobePacketNode {
  mesh: THREE.Mesh;
  radiusX: number;
  radiusY: number;
  speed: number;
  phase: number;
  zOffset: number;
}

export interface GlobeIconState {
  coreGroup: THREE.Group | null;
  orbitalGroup: THREE.Group | null;
  auxPanels: GlobeAuxPanel[];
  pulseMaterials: GlobePulseMaterial[];
  packetNodes: GlobePacketNode[];
}

export function createEmptyGlobeIconState(): GlobeIconState {
  return {
    coreGroup: null,
    orbitalGroup: null,
    auxPanels: [],
    pulseMaterials: [],
    packetNodes: [],
  };
}

export function buildGlobeIcon(group: THREE.Group, scene: THREE.Scene): GlobeIconState {
  const radius = 0.92;
  const state = createEmptyGlobeIconState();

  const PULSE_AMPLITUDE_SCALE = 0.2;
  const PULSE_SPEED_SCALE = 0.35;
  const addPulse = (
    material: THREE.Material,
    baseOpacity: number,
    amplitude: number,
    speed: number,
    phase: number
  ): void => {
    state.pulseMaterials.push({
      material,
      baseOpacity,
      amplitude: amplitude * PULSE_AMPLITUDE_SCALE,
      speed: speed * PULSE_SPEED_SCALE,
      phase,
    });
  };

  const globeFillLight = new THREE.PointLight(0x6dff80, 0.38, 8.0, 2.0);
  globeFillLight.position.set(1.45, 1.18, 1.52);
  scene.add(globeFillLight);

  const globeRimLight = new THREE.PointLight(0xacff7a, 0.24, 7.5, 2.0);
  globeRimLight.position.set(-1.44, 0.14, -1.36);
  scene.add(globeRimLight);

  const globeBackLight = new THREE.PointLight(0x46f08a, 0.12, 7.0, 2.0);
  globeBackLight.position.set(0, -1.35, -1.45);
  scene.add(globeBackLight);

  const coreGroup = new THREE.Group();
  group.add(coreGroup);
  state.coreGroup = coreGroup;

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
    const startLat = -Math.PI * 0.5;
    const latSpan = Math.PI;
    for (let segment = 0; segment <= segments; segment++) {
      const lat = startLat + (segment / segments) * latSpan;
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
    orbitGuidePoints.push(
      new THREE.Vector3(Math.cos(angle) * radius * 1.22, Math.sin(angle) * radius * 0.76, 0)
    );
  }
  const orbitGuideMaterial = new THREE.LineBasicMaterial({
    color: 0xb4ff79,
    transparent: true,
    opacity: 0.12,
    blending: THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const orbitGuide = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(orbitGuidePoints),
    orbitGuideMaterial
  );
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
    map: createOffsetGlowTexture(),
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
  state.orbitalGroup = orbitalGroup;

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
    state.packetNodes.push({
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
    const texture = createGlobeAuxTerminalTexture(title, subtitle, rows);
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
      depthTest: true,
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
      depthTest: true,
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
      depthTest: true,
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
  group.add(rightPanel);
  state.auxPanels.push({
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
  group.add(leftPanel);
  state.auxPanels.push({
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
  group.add(topPanel);
  state.auxPanels.push({
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
  const addConnector = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    offsetY: number,
    phase: number
  ): void => {
    const mid = start.clone().lerp(end, 0.5);
    mid.y += offsetY;
    const connectorMaterial = connectorTemplate.clone();
    const connector = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([start, mid, end]),
      connectorMaterial
    );
    group.add(connector);
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
    group.add(marker);
    addPulse(markerMaterial, 0.56, 0.05, 3.4, index * 0.52);
  });

  group.rotation.set(-0.18, 0.46, 0.04);
  return state;
}

export function updateGlobeOrbitNodes(state: GlobeIconState, elapsedSeconds: number): void {
  if (state.packetNodes.length === 0) {
    return;
  }

  for (let i = 0; i < state.packetNodes.length; i++) {
    const packet = state.packetNodes[i];
    const angle = elapsedSeconds * (packet.speed * 0.85) + packet.phase;
    const radialJitter = 1 + Math.sin(elapsedSeconds * 0.45 + packet.phase * 1.7) * 0.03;

    packet.mesh.position.set(
      Math.cos(angle) * packet.radiusX * radialJitter,
      Math.sin(angle) * packet.radiusY * radialJitter,
      packet.zOffset + Math.sin(angle * 2.2 + packet.phase * 0.85) * 0.05
    );

    const material = packet.mesh.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      material.opacity =
        0.2 + 0.18 * (0.5 + 0.5 * Math.sin(elapsedSeconds * (2.1 + packet.speed * 0.4) + packet.phase));
    }
  }
}

function createOffsetGlowTexture(): THREE.CanvasTexture {
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

function createGlobeAuxTerminalTexture(
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
