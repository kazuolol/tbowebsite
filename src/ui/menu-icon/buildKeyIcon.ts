import * as THREE from 'three';

export function buildKeyIcon(group: THREE.Group, scene: THREE.Scene): void {
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
  scene.add(keyFillLight);
  const keyRimLight = new THREE.PointLight(0xffd788, 0.58, 6.5, 2.0);
  keyRimLight.position.set(-1.1, -0.55, -1.15);
  scene.add(keyRimLight);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.75, 12), goldMaterial);
  shaft.position.set(0, -0.06, 0);
  group.add(shaft);

  const shaftTop = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.24, 12), deepGoldMaterial);
  shaftTop.position.set(0, 0.88, 0);
  group.add(shaftTop);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.038, 8, 18), deepGoldMaterial);
  collar.rotation.x = Math.PI * 0.5;
  collar.position.set(0, 0.72, 0);
  group.add(collar);

  const bitStem = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.38, 0.18), goldMaterial);
  bitStem.position.set(0.02, 1.08, 0);
  group.add(bitStem);

  const toothTop = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.18), goldMaterial);
  toothTop.position.set(0.24, 1.2, 0);
  group.add(toothTop);

  const toothMid = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.18), deepGoldMaterial);
  toothMid.position.set(0.21, 1.04, 0);
  group.add(toothMid);

  const toothLow = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.12, 0.18), goldMaterial);
  toothLow.position.set(0.17, 0.88, 0);
  group.add(toothLow);

  const toothTip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.18), deepGoldMaterial);
  toothTip.position.set(0.43, 1.11, 0);
  group.add(toothTip);

  const neckLeft = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.18), deepGoldMaterial);
  neckLeft.position.set(-0.1, -0.94, 0);
  neckLeft.rotation.z = 0.4;
  group.add(neckLeft);

  const neckRight = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.18), deepGoldMaterial);
  neckRight.position.set(0.1, -0.94, 0);
  neckRight.rotation.z = -0.4;
  group.add(neckRight);

  const bowOuter = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.11, 10, 24), goldMaterial);
  bowOuter.scale.y = 0.8;
  bowOuter.position.set(0, -1.18, 0);
  group.add(bowOuter);

  const bowInnerAccent = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 18), deepGoldMaterial);
  bowInnerAccent.scale.y = 0.8;
  bowInnerAccent.position.set(0, -1.18, 0.02);
  group.add(bowInnerAccent);

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
  const baseKeyMeshes = group.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);
  for (const baseMesh of baseKeyMeshes) {
    const haloMesh = new THREE.Mesh(baseMesh.geometry.clone(), keyHaloMaterial);
    haloMesh.position.copy(baseMesh.position);
    haloMesh.quaternion.copy(baseMesh.quaternion);
    haloMesh.scale.copy(baseMesh.scale).multiplyScalar(1.02);
    group.add(haloMesh);
  }

  // Billboarded golden aura behind the key.
  const keyGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createRadialGlowTexture(
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
  scene.add(keyGlow);

  // Base orientation: key teeth point away from camera.
  group.rotation.set(0, Math.PI * 0.5, 0);
}

function createRadialGlowTexture(inner: string, mid: string, outer: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.45, mid);
  gradient.addColorStop(1, outer);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
