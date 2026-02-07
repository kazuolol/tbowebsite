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
    const radius = 1.04;
    const base = new THREE.IcosahedronGeometry(radius, 1).toNonIndexed();
    const positions = base.getAttribute('position') as THREE.BufferAttribute;
    const nodes: THREE.Vector3[] = [];
    const triangles: Array<[number, number, number]> = [];
    const nodeLookup = new Map<string, number>();
    const neighbors: Array<Set<number>> = [];
    const activeEdges = new Set<string>();

    const hash01 = (seed: number): number => {
      const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
      return v - Math.floor(v);
    };

    const edgeKey = (a: number, b: number): string => {
      return a < b ? `${a}:${b}` : `${b}:${a}`;
    };

    const parseEdgeKey = (key: string): [number, number] => {
      const split = key.indexOf(':');
      return [Number.parseInt(key.slice(0, split), 10), Number.parseInt(key.slice(split + 1), 10)];
    };

    const registerNode = (x: number, y: number, z: number): number => {
      const rawKey = `${Math.round(x * 100000)}:${Math.round(y * 100000)}:${Math.round(z * 100000)}`;
      const existing = nodeLookup.get(rawKey);
      if (existing !== undefined) {
        return existing;
      }

      const seed = x * 13.371 + y * 97.173 + z * 53.917;
      const axis = new THREE.Vector3(hash01(seed + 1) * 2 - 1, hash01(seed + 2) * 2 - 1, hash01(seed + 3) * 2 - 1);
      const source = new THREE.Vector3(x, y, z).normalize();
      const tangent = axis.clone().cross(source);
      if (tangent.lengthSq() < 1e-6) {
        tangent.set(1, 0, 0).cross(source);
      }
      tangent.normalize();
      const bitangent = source.clone().cross(tangent).normalize();
      const jitterA = (hash01(seed + 4) - 0.5) * 0.12;
      const jitterB = (hash01(seed + 5) - 0.5) * 0.12;
      const node = source
        .clone()
        .addScaledVector(tangent, jitterA)
        .addScaledVector(bitangent, jitterB)
        .normalize()
        .multiplyScalar(radius);

      const index = nodes.length;
      nodes.push(node);
      nodeLookup.set(rawKey, index);
      return index;
    };

    for (let i = 0; i < positions.count; i += 3) {
      const a = registerNode(positions.getX(i), positions.getY(i), positions.getZ(i));
      const b = registerNode(positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1));
      const c = registerNode(positions.getX(i + 2), positions.getY(i + 2), positions.getZ(i + 2));
      if (a !== b && b !== c && c !== a) {
        triangles.push([a, b, c]);
      }
    }
    base.dispose();

    for (let i = 0; i < nodes.length; i++) {
      neighbors.push(new Set<number>());
    }

    const addEdge = (a: number, b: number): void => {
      const key = edgeKey(a, b);
      if (activeEdges.has(key)) {
        return;
      }
      activeEdges.add(key);
      neighbors[a].add(b);
      neighbors[b].add(a);
    };

    for (const [a, b, c] of triangles) {
      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
    }

    const hasAlternatePath = (start: number, end: number, skipKey: string): boolean => {
      const visited = new Set<number>([start]);
      const stack = [start];
      while (stack.length > 0) {
        const node = stack.pop()!;
        if (node === end) {
          return true;
        }
        for (const next of neighbors[node]) {
          if (!activeEdges.has(edgeKey(node, next))) continue;
          if (edgeKey(node, next) === skipKey) continue;
          if (visited.has(next)) continue;
          visited.add(next);
          stack.push(next);
        }
      }
      return false;
    };

    const removable = Array.from(activeEdges).map((key) => {
      const [a, b] = parseEdgeKey(key);
      const distance = nodes[a].distanceTo(nodes[b]);
      const randomness = hash01(a * 41.27 + b * 17.93);
      return {
        key,
        a,
        b,
        score: distance * 0.9 + randomness * 0.55,
      };
    });
    removable.sort((lhs, rhs) => rhs.score - lhs.score);

    const removalTarget = Math.floor(removable.length * 0.2);
    let removed = 0;
    for (const candidate of removable) {
      if (removed >= removalTarget) break;
      if (!activeEdges.has(candidate.key)) continue;
      if (neighbors[candidate.a].size <= 3 || neighbors[candidate.b].size <= 3) continue;
      if (!hasAlternatePath(candidate.a, candidate.b, candidate.key)) continue;

      activeEdges.delete(candidate.key);
      neighbors[candidate.a].delete(candidate.b);
      neighbors[candidate.b].delete(candidate.a);
      removed++;
    }

    const linePositions: number[] = [];
    for (const key of activeEdges) {
      const [a, b] = parseEdgeKey(key);
      const start = nodes[a];
      const end = nodes[b];
      linePositions.push(start.x, start.y, start.z, end.x, end.y, end.z);
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

    const edgeGlow = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: 0x10663d,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.group.add(edgeGlow);

    const edgeCore = new THREE.LineSegments(
      lineGeometry.clone(),
      new THREE.LineBasicMaterial({
        color: 0x6af0a8,
        transparent: true,
        opacity: 0.86,
        blending: THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.group.add(edgeCore);

    const rimPoints: THREE.Vector3[] = [];
    const rimSegments = 96;
    for (let i = 0; i < rimSegments; i++) {
      const t = (i / rimSegments) * Math.PI * 2;
      rimPoints.push(new THREE.Vector3(Math.cos(t) * radius * 1.006, Math.sin(t) * radius * 1.006, 0));
    }
    const rim = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(rimPoints),
      new THREE.LineBasicMaterial({
        color: 0x59dc96,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.group.add(rim);

    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: 0xccffe5,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      toneMapped: false,
    });
    const hubMaterial = new THREE.MeshBasicMaterial({
      color: 0xf5fff9,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      toneMapped: false,
    });
    const nodeGeometry = new THREE.SphereGeometry(0.024, 10, 10);
    const hubGeometry = new THREE.SphereGeometry(0.041, 12, 12);

    nodes.forEach((position, index) => {
      const degree = neighbors[index].size;
      const isHub = degree >= 5;
      const marker = new THREE.Mesh(isHub ? hubGeometry : nodeGeometry, isHub ? hubMaterial : nodeMaterial);
      marker.position.copy(position);
      this.group.add(marker);
    });

    const hotspot = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createRadialGlowTexture(
          'rgba(228, 255, 236, 0.98)',
          'rgba(95, 255, 164, 0.58)',
          'rgba(0, 0, 0, 0)'
        ),
        color: 0x9cffc9,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    hotspot.position.set(0.74, 0.58, 0.9);
    hotspot.scale.set(1.12, 1.12, 1);
    this.group.add(hotspot);

    const aura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createOffsetGlowTexture(),
        color: 0x48da83,
        transparent: true,
        opacity: 0.64,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    aura.position.set(0.92, 0.5, 0.25);
    aura.scale.set(2.48, 1.95, 1);
    this.group.add(aura);

    this.group.rotation.set(-0.1, 0.34, 0.06);
  }

  private buildInboxPlaceholder(): void {
    const maps = this.createEnvelopePaperMaps();
    const paperMaterial = new THREE.MeshStandardMaterial({
      map: maps.color,
      bumpMap: maps.bump,
      bumpScale: 0.03,
      roughnessMap: maps.roughness,
      roughness: 0.98,
      metalness: 0.0,
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xd8c39a,
      roughness: 0.98,
      metalness: 0.0,
    });
    const flapMaterial = new THREE.MeshStandardMaterial({
      map: maps.color,
      bumpMap: maps.bump,
      bumpScale: 0.018,
      roughnessMap: maps.roughness,
      roughness: 0.98,
      metalness: 0.0,
      color: 0xf4eee0,
      side: THREE.DoubleSide,
    });

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.3, 0.055), edgeMaterial);
    back.position.set(0, -0.02, -0.022);
    this.group.add(back);

    const faceGeometry = new THREE.PlaneGeometry(1.86, 1.26, 26, 18);
    const facePositions = faceGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < facePositions.count; i++) {
      const x = facePositions.getX(i);
      const y = facePositions.getY(i);
      const largeFold = Math.cos((x / 0.93) * Math.PI * 0.78) * Math.cos((y / 0.63) * Math.PI * 0.86) * 0.011;
      const microFold = Math.sin((x * 6.8) + (y * 3.2)) * 0.0025;
      facePositions.setZ(i, 0.012 + largeFold + microFold);
    }
    faceGeometry.computeVertexNormals();

    const face = new THREE.Mesh(faceGeometry, paperMaterial);
    face.position.set(0, -0.02, 0.005);
    this.group.add(face);

    const flapShape = new THREE.Shape();
    flapShape.moveTo(-0.84, 0.22);
    flapShape.lineTo(0.84, 0.22);
    flapShape.lineTo(0.0, -0.4);
    flapShape.closePath();
    const flap = new THREE.Mesh(new THREE.ShapeGeometry(flapShape), flapMaterial);
    flap.position.set(0, 0.24, 0.018);
    flap.rotation.x = -0.14;
    this.group.add(flap);

    const seamMaterial = new THREE.LineBasicMaterial({
      color: 0xb6a98b,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      toneMapped: false,
    });
    const seamPoints = [
      new THREE.Vector3(-0.86, 0.22, 0.029),
      new THREE.Vector3(0, -0.4, 0.029),
      new THREE.Vector3(0.86, 0.22, 0.029),
    ];
    const seamGeometry = new THREE.BufferGeometry().setFromPoints(seamPoints);
    const seam = new THREE.Line(seamGeometry, seamMaterial);
    this.group.add(seam);

    this.group.rotation.set(-0.2, 0.36, -0.2);
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
      color: 0xf1f4f8,
      emissive: 0x15181d,
      emissiveIntensity: 0.08,
      metalness: 0.18,
      roughness: 0.36,
      clearcoat: 0.84,
      clearcoatRoughness: 0.24,
    });
    const shellInnerMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6dce4,
      metalness: 0.08,
      roughness: 0.46,
    });
    const darkPanelMaterial = new THREE.MeshStandardMaterial({
      color: 0x273238,
      metalness: 0.08,
      roughness: 0.52,
    });
    const keyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3f5fb8,
      emissive: 0x1e3270,
      emissiveIntensity: 0.32,
      metalness: 0.08,
      roughness: 0.34,
    });
    const keyDarkMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c468f,
      emissive: 0x172654,
      emissiveIntensity: 0.2,
      metalness: 0.06,
      roughness: 0.42,
    });

    const lowerShell = createRoundedPanel(1.08, 1.34, 0.2, 0.16, shellMaterial);
    lowerShell.position.set(0, -0.56, 0);
    this.group.add(lowerShell);

    const lowerInner = createRoundedPanel(0.92, 1.12, 0.06, 0.12, shellInnerMaterial);
    lowerInner.position.set(0, -0.5, 0.1);
    this.group.add(lowerInner);

    const keypadPanel = createRoundedPanel(0.84, 0.8, 0.028, 0.07, darkPanelMaterial);
    keypadPanel.position.set(0, -0.62, 0.14);
    this.group.add(keypadPanel);

    const navRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 12, 28), keyDarkMaterial);
    navRing.position.set(0, -0.19, 0.14);
    this.group.add(navRing);

    const navCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 18), keyMaterial);
    navCenter.position.set(0, -0.19, 0.15);
    navCenter.rotation.x = Math.PI * 0.5;
    this.group.add(navCenter);

    const keyGeometry = new THREE.BoxGeometry(0.17, 0.13, 0.035);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const key = new THREE.Mesh(keyGeometry, (row + col) % 2 === 0 ? keyMaterial : keyDarkMaterial);
        key.position.set(-0.24 + col * 0.24, -0.43 - row * 0.18, 0.15);
        this.group.add(key);
      }
    }

    const softKeyLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.03), keyMaterial);
    softKeyLeft.position.set(-0.29, -0.22, 0.15);
    softKeyLeft.rotation.z = 0.2;
    this.group.add(softKeyLeft);

    const softKeyRight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.03), keyMaterial);
    softKeyRight.position.set(0.29, -0.22, 0.15);
    softKeyRight.rotation.z = -0.2;
    this.group.add(softKeyRight);

    const hingeLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.24, 16), shellInnerMaterial);
    hingeLeft.rotation.z = Math.PI * 0.5;
    hingeLeft.position.set(-0.18, 0.08, -0.01);
    this.group.add(hingeLeft);

    const hingeRight = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.24, 16), shellInnerMaterial);
    hingeRight.rotation.z = Math.PI * 0.5;
    hingeRight.position.set(0.18, 0.08, -0.01);
    this.group.add(hingeRight);

    const upperPivot = new THREE.Group();
    upperPivot.position.set(0, 0.08, -0.01);
    this.group.add(upperPivot);

    const upperShell = createRoundedPanel(1.0, 1.28, 0.2, 0.16, shellMaterial);
    upperShell.position.set(0, 0.62, 0);
    upperPivot.add(upperShell);

    const upperInner = createRoundedPanel(0.86, 1.0, 0.06, 0.12, shellInnerMaterial);
    upperInner.position.set(0, 0.6, 0.09);
    upperPivot.add(upperInner);

    const screenFrame = createRoundedPanel(0.72, 0.84, 0.026, 0.06, darkPanelMaterial);
    screenFrame.position.set(0, 0.62, 0.13);
    upperPivot.add(screenFrame);

    const screenTexture = this.createPhoneScreenTexture();
    screenTexture.needsUpdate = true;
    screenTexture.minFilter = THREE.LinearFilter;
    screenTexture.magFilter = THREE.LinearFilter;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.76),
      new THREE.MeshBasicMaterial({
        map: screenTexture,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    screen.position.set(0, 0.62, 0.165);
    screen.rotation.y = Math.PI;
    screen.renderOrder = 20;
    const screenMaterial = screen.material as THREE.MeshBasicMaterial;
    screenMaterial.depthTest = false;
    screenMaterial.depthWrite = false;
    upperPivot.add(screen);

    const speaker = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.045, 0.02), keyDarkMaterial);
    speaker.position.set(0, 1.03, 0.12);
    upperPivot.add(speaker);

    const cameraDot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.015, 12),
      new THREE.MeshStandardMaterial({
        color: 0x89ffb3,
        emissive: 0x48aa73,
        emissiveIntensity: 0.34,
        metalness: 0.08,
        roughness: 0.32,
      })
    );
    cameraDot.rotation.x = Math.PI * 0.5;
    cameraDot.position.set(0, 1.08, 0.125);
    upperPivot.add(cameraDot);

    // Open toward the camera at a readable angle.
    upperPivot.rotation.x = 0.58;

    this.group.rotation.set(-0.2, 0.38, 0.02);
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

  private createPhoneScreenTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 448;
    const ctx = canvas.getContext('2d')!;

    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#1d2b34');
    bg.addColorStop(0.55, '#17222a');
    bg.addColorStop(1, '#121a21');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(36, 54, 63, 0.95)';
    ctx.fillRect(0, 0, canvas.width, 52);
    ctx.fillStyle = '#d4e8f5';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Friends', 16, 33);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(20, 72, 280, 288);

    // Large, unmistakable yellow smiley on screen.
    const smileX = 160;
    const smileY = 192;
    const smileR = 88;
    ctx.fillStyle = '#ffd935';
    ctx.beginPath();
    ctx.arc(smileX, smileY, smileR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222226';
    ctx.beginPath();
    ctx.arc(smileX - 28, smileY - 24, 11, 0, Math.PI * 2);
    ctx.arc(smileX + 28, smileY - 24, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222226';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(smileX, smileY + 8, 39, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.fillStyle = '#dfffea';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('SMILEY MSG', 96, 330);

    ctx.fillStyle = 'rgba(36, 54, 63, 0.95)';
    ctx.fillRect(0, canvas.height - 44, canvas.width, 44);
    ctx.fillStyle = '#9fd3f2';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Reply', 24, canvas.height - 14);
    ctx.fillText('Back', canvas.width - 74, canvas.height - 14);

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
      // Very subtle spin for GlobaNet icon.
      this.group.rotation.set(-0.1, 0.34 + this.elapsed * 0.09, 0.06);
      this.group.position.set(0, 0, 0);
      this.group.scale.set(1, 1, 1);
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
    } else if (this.type === 'inbox' || this.type === 'friends') {
      const baseX = this.type === 'inbox' ? -0.16 : -0.04;
      const baseY = this.type === 'inbox' ? 0.46 : 0.2;
      const baseZ = this.type === 'inbox' ? -0.03 : 0.01;
      this.group.rotation.x = baseX + Math.sin(this.elapsed * 0.9) * 0.03;
      const spinY = this.type === 'friends' ? Math.sin(this.elapsed * 0.55) * 0.12 : this.elapsed * 0.42;
      this.group.rotation.y = baseY + spinY;
      this.group.rotation.z = baseZ + Math.sin(this.elapsed * 0.7) * 0.02;
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
  }
}
