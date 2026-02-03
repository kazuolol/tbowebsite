import * as THREE from 'three';
import grassVertexShader from '../shaders/grass.vert.glsl';
import grassFragmentShader from '../shaders/grass.frag.glsl';

export class Grass {
  public mesh: THREE.InstancedMesh;
  private material: THREE.ShaderMaterial;

  constructor(instanceCount: number = 50000) {
    // Create blade geometry - simple quad that tapers at top
    const geometry = this.createBladeGeometry();

    // Shader material for wind and cel-shading
    this.material = new THREE.ShaderMaterial({
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWindStrength: { value: 0.3 },
        uBaseColor: { value: new THREE.Color(0x2d5a27) },  // Dark green base
        uTipColor: { value: new THREE.Color(0x7cb342) },   // Bright green tip
        uDarkColor: { value: new THREE.Color(0x1a3d18) }   // Very dark for variation
      },
      side: THREE.DoubleSide,
      transparent: false
    });

    // Create instanced mesh
    this.mesh = new THREE.InstancedMesh(geometry, this.material, instanceCount);

    // Set up instance attributes
    this.setupInstances(instanceCount);
  }

  private createBladeGeometry(): THREE.BufferGeometry {
    // Simple grass blade quad
    const width = 0.08;
    const height = 0.8;
    const segments = 4;

    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * height;
      const w = width * (1 - t * 0.8); // Taper towards top

      vertices.push(-w / 2, y, 0);
      vertices.push(w / 2, y, 0);

      uvs.push(0, t);
      uvs.push(1, t);

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return geometry;
  }

  private setupInstances(count: number): void {
    const offsets = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const rotations = new Float32Array(count);

    const fieldRadius = 20;

    for (let i = 0; i < count; i++) {
      // Random position in circular field
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * fieldRadius; // sqrt for uniform distribution

      offsets[i * 3] = Math.cos(angle) * radius;
      offsets[i * 3 + 1] = 0;
      offsets[i * 3 + 2] = Math.sin(angle) * radius;

      // Random scale (0.5 to 1.5)
      scales[i] = 0.5 + Math.random();

      // Random rotation around Y axis
      rotations[i] = Math.random() * Math.PI * 2;
    }

    // Add instance attributes
    this.mesh.geometry.setAttribute(
      'offset',
      new THREE.InstancedBufferAttribute(offsets, 3)
    );
    this.mesh.geometry.setAttribute(
      'scale',
      new THREE.InstancedBufferAttribute(scales, 1)
    );
    this.mesh.geometry.setAttribute(
      'rotation',
      new THREE.InstancedBufferAttribute(rotations, 1)
    );

    // Dummy matrix (required by InstancedMesh but we use attributes instead)
    const dummy = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      this.mesh.setMatrixAt(i, dummy);
    }
  }

  public update(time: number): void {
    this.material.uniforms.uTime.value = time;
  }
}
