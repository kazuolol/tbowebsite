import * as THREE from 'three';

export interface InboxOrbitParticle {
  sprite: THREE.Sprite;
  orbitRadiusX: number;
  orbitRadiusZ: number;
  speed: number;
  phase: number;
  yBobAmplitude: number;
  yBobSpeed: number;
  baseScale: number;
  opacityPhase: number;
}

export interface InboxIconState {
  orbitCenter: THREE.Group | null;
  orbitParticles: InboxOrbitParticle[];
}

export type CreateRadialGlowTexture = (
  inner: string,
  mid: string,
  outer: string
) => THREE.CanvasTexture;

export function createEmptyInboxIconState(): InboxIconState {
  return {
    orbitCenter: null,
    orbitParticles: [],
  };
}

export function buildInboxIcon(
  group: THREE.Group,
  scene: THREE.Scene,
  elapsedSeconds: number,
  createRadialGlowTexture: CreateRadialGlowTexture
): InboxIconState {
  const state = createEmptyInboxIconState();
  const texture = createMailEnvelopeTexture();
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
    emissiveIntensity: 0.045,
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
    emissiveIntensity: 0.028,
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
    emissiveIntensity: 0.02,
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
    emissiveIntensity: 0.028,
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
  const foldRidgeMaterial = new THREE.MeshBasicMaterial({
    color: 0xb7c4d8,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    toneMapped: false,
  });
  const foldShadowMaterial = new THREE.MeshBasicMaterial({
    color: 0xe3e8f0,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });

  const mailFillLight = new THREE.PointLight(0xfff8ec, 0.4, 6.5, 2.0);
  mailFillLight.position.set(1.05, 0.92, 1.55);
  scene.add(mailFillLight);
  const mailRimLight = new THREE.PointLight(0xfff0d8, 0.14, 5.6, 2.0);
  mailRimLight.position.set(-1.0, -0.42, -0.95);
  scene.add(mailRimLight);
  const mailEdgeLight = new THREE.PointLight(0x2e7dff, 0.34, 6.2, 2.0);
  mailEdgeLight.position.set(0.02, 0.2, 1.55);
  scene.add(mailEdgeLight);
  const mailBackGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createRadialGlowTexture(
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
  scene.add(mailBackGlow);

  const orbitParticleMap = createRadialGlowTexture(
    'rgba(232, 248, 255, 1)',
    'rgba(92, 183, 255, 0.9)',
    'rgba(0, 0, 0, 0)'
  );
  const orbitCenter = new THREE.Group();
  // Center the orbit around the envelope body so particles pass in front and behind.
  orbitCenter.position.set(0, -0.03, 0.02);
  group.add(orbitCenter);
  state.orbitCenter = orbitCenter;
  state.orbitParticles = [];

  for (let i = 0; i < 3; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: orbitParticleMap,
        color: 0xb4e3ff,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
      })
    );
    sprite.renderOrder = 24;
    orbitCenter.add(sprite);
    state.orbitParticles.push({
      sprite,
      orbitRadiusX: 1.28 + i * 0.06,
      orbitRadiusZ: 0.52 + i * 0.04,
      speed: 1.12 + i * 0.14,
      phase: (i / 3) * Math.PI * 2,
      yBobAmplitude: 0.075 + i * 0.01,
      yBobSpeed: 2.2 + i * 0.25,
      baseScale: 0.11 + i * 0.007,
      opacityPhase: i * 1.37,
    });
  }
  updateInboxOrbitParticles(state, elapsedSeconds);

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
  group.add(body);

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
  group.add(bodyOutline);

  const bodyOutlineGlow = new THREE.LineSegments(
    new THREE.EdgesGeometry(bodyGeometry, 22),
    glowOutlineMaterial
  );
  bodyOutlineGlow.position.copy(body.position);
  bodyOutlineGlow.scale.setScalar(1.014);
  group.add(bodyOutlineGlow);

  const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(1.94, 1.34), faceMaterial);
  frontFace.position.set(0, -0.03, 0.138);
  group.add(frontFace);

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
  group.add(flap);

  const createFoldRidge = (
    parent: THREE.Object3D,
    start: THREE.Vector3,
    end: THREE.Vector3
  ): void => {
    const direction = end.clone().sub(start);
    const length = direction.length();
    const ridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0054, 0.0054, length, 12),
      foldRidgeMaterial
    );
    ridge.position.copy(start).add(end).multiplyScalar(0.5);
    ridge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    parent.add(ridge);
  };

  const flapApex = new THREE.Vector3(0, -0.16, 0.0125);

  createFoldRidge(flap, new THREE.Vector3(-0.97, 0.54, 0.0125), flapApex);
  createFoldRidge(flap, new THREE.Vector3(0.97, 0.54, 0.0125), flapApex);

  const foldShadowShape = new THREE.Shape();
  foldShadowShape.moveTo(-0.95, 0.52);
  foldShadowShape.lineTo(0.95, 0.52);
  foldShadowShape.lineTo(0.055, -0.1);
  foldShadowShape.lineTo(-0.055, -0.1);
  foldShadowShape.closePath();
  const foldShadow = new THREE.Mesh(new THREE.ShapeGeometry(foldShadowShape), foldShadowMaterial);
  foldShadow.position.set(0, 0, 0.0095);
  flap.add(foldShadow);

  group.rotation.set(-0.1, 0.04, -0.09);
  group.scale.setScalar(0.9);
  return state;
}

export function updateInboxOrbitParticles(state: InboxIconState, elapsedSeconds: number): void {
  if (!state.orbitCenter || state.orbitParticles.length === 0) {
    return;
  }

  for (let i = 0; i < state.orbitParticles.length; i++) {
    const particle = state.orbitParticles[i];
    const angle = elapsedSeconds * particle.speed + particle.phase;
    const radialScale =
      1 + Math.sin(elapsedSeconds * (1.2 + i * 0.22) + particle.phase * 1.15) * 0.035;
    const x = Math.cos(angle) * particle.orbitRadiusX * radialScale;
    const z = Math.sin(angle) * particle.orbitRadiusZ * radialScale;
    const y =
      Math.sin(elapsedSeconds * particle.yBobSpeed + angle * 1.9 + particle.phase) *
      particle.yBobAmplitude;
    particle.sprite.position.set(x, y, z);

    const pulse =
      0.9 +
      0.1 * (0.5 + 0.5 * Math.sin(elapsedSeconds * particle.yBobSpeed + particle.opacityPhase));

    const frontFactor = THREE.MathUtils.clamp(
      (z / Math.max(0.0001, particle.orbitRadiusZ) + 1) * 0.5,
      0,
      1
    );
    const depthScale = 0.92 + frontFactor * 0.16;
    particle.sprite.scale.setScalar(particle.baseScale * pulse * depthScale);

    const material = particle.sprite.material as THREE.SpriteMaterial;
    material.opacity =
      0.14 +
      0.1 * frontFactor +
      0.12 *
        (0.5 +
          0.5 *
            Math.sin(elapsedSeconds * (particle.yBobSpeed + 0.56) + particle.opacityPhase));
  }
}

function createMailEnvelopeTexture(): THREE.CanvasTexture {
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

  const highlight = ctx.createRadialGradient(
    width * 0.4,
    height * 0.17,
    20,
    width * 0.54,
    height * 0.3,
    320
  );
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
