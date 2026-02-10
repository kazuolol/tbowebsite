import * as THREE from 'three';

export function buildInfoIcon(group: THREE.Group): void {
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
      map: createPaperTexture(),
      color: 0xead7b6,
      side: THREE.DoubleSide,
    })
  );
  paper.rotation.z = -0.26;
  group.add(paper);

  group.rotation.set(-0.45, 0.18, -0.08);
}

function createPaperTexture(): THREE.CanvasTexture {
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
