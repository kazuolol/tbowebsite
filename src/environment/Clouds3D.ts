import * as THREE from 'three';
import cloudVertexShader from '../shaders/cloudpuff.vert.glsl';
import cloudFragmentShader from '../shaders/cloudpuff.frag.glsl';

interface CloudCluster {
  x: number;
  y: number;
  z: number;
  puffCount: number;
  radius: number;
}

export class Clouds3D {
  public mesh: THREE.InstancedMesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    const clusters = this.generateClusters();
    const totalPuffs = clusters.reduce((sum, c) => sum + c.puffCount, 0);

    // Simple quad geometry for billboards
    const geometry = new THREE.PlaneGeometry(1, 1);

    this.material = new THREE.ShaderMaterial({
      vertexShader: cloudVertexShader,
      fragmentShader: cloudFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        // Ethereal Dreamcast-style cloud colors
        uCloudColor: { value: new THREE.Color(0xffffff) },
        uCloudShadow: { value: new THREE.Color(0xc8dce8) },  // Soft blue shadow
        uSkyColor: { value: new THREE.Color(0xd0e4f0) }      // Pale misty blend
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending
    });

    this.mesh = new THREE.InstancedMesh(geometry, this.material, totalPuffs);
    this.mesh.frustumCulled = false;

    this.generatePuffs(clusters, totalPuffs);
  }

  private generateClusters(): CloudCluster[] {
    const clusters: CloudCluster[] = [];

    // Fly-through corridor: clouds spread in front of camera along Z axis
    // Camera looks toward -Z, so clouds spawn at negative Z values

    // Close-pass clouds - fly right through these
    for (let i = 0; i < 8; i++) {
      clusters.push({
        x: (Math.random() - 0.5) * 60,  // Spread across view
        y: 5 + Math.random() * 30,
        z: -50 - Math.random() * 400,   // Spread along flight path
        puffCount: Math.floor(30 + Math.random() * 40),
        radius: 20 + Math.random() * 25
      });
    }

    // Large fluffy cloud formations - scattered throughout corridor
    for (let i = 0; i < 25; i++) {
      clusters.push({
        x: (Math.random() - 0.5) * 200,
        y: 20 + Math.random() * 60,
        z: -Math.random() * 450,
        puffCount: Math.floor(45 + Math.random() * 55),
        radius: 30 + Math.random() * 40
      });
    }

    // Medium clouds - fill in gaps
    for (let i = 0; i < 20; i++) {
      clusters.push({
        x: (Math.random() - 0.5) * 150,
        y: 15 + Math.random() * 45,
        z: -Math.random() * 450,
        puffCount: Math.floor(25 + Math.random() * 35),
        radius: 18 + Math.random() * 22
      });
    }

    // Small wisps - add detail
    for (let i = 0; i < 30; i++) {
      clusters.push({
        x: (Math.random() - 0.5) * 180,
        y: 10 + Math.random() * 50,
        z: -Math.random() * 450,
        puffCount: Math.floor(12 + Math.random() * 18),
        radius: 10 + Math.random() * 15
      });
    }

    return clusters;
  }

  private generatePuffs(clusters: CloudCluster[], totalPuffs: number): void {
    const offsets = new Float32Array(totalPuffs * 3);
    const scales = new Float32Array(totalPuffs);
    const brightnesses = new Float32Array(totalPuffs);

    let puffIndex = 0;
    const dummy = new THREE.Matrix4();

    for (const cluster of clusters) {
      for (let i = 0; i < cluster.puffCount; i++) {
        // Spherical distribution but flattened
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.pow(Math.random(), 0.3) * cluster.radius;

        const localX = r * Math.sin(phi) * Math.cos(theta);
        const localY = r * Math.sin(phi) * Math.sin(theta) * 0.4; // Flatten
        const localZ = r * Math.cos(phi) * 0.6;

        offsets[puffIndex * 3] = cluster.x + localX;
        offsets[puffIndex * 3 + 1] = cluster.y + localY;
        offsets[puffIndex * 3 + 2] = cluster.z + localZ;

        // Varied scales - many small, some large
        scales[puffIndex] = 8 + Math.random() * 20;

        // Brighter on top
        const heightFactor = (localY + cluster.radius * 0.4) / (cluster.radius * 0.8);
        brightnesses[puffIndex] = 0.7 + Math.min(1.0, heightFactor) * 0.3;

        this.mesh.setMatrixAt(puffIndex, dummy);
        puffIndex++;
      }
    }

    this.mesh.geometry.setAttribute(
      'offset',
      new THREE.InstancedBufferAttribute(offsets, 3)
    );
    this.mesh.geometry.setAttribute(
      'scale',
      new THREE.InstancedBufferAttribute(scales, 1)
    );
    this.mesh.geometry.setAttribute(
      'brightness',
      new THREE.InstancedBufferAttribute(brightnesses, 1)
    );
  }

  public update(time: number): void {
    this.material.uniforms.uTime.value = time;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
