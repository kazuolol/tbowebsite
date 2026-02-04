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
        uCloudColor: { value: new THREE.Color(0xffffff) },
        uCloudShadow: { value: new THREE.Color(0xd0d8e0) },
        uSkyColor: { value: new THREE.Color(0x7ec0ee) }
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

    // Large fluffy cloud formations
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 200;
      const height = 30 + Math.random() * 60;

      clusters.push({
        x: Math.cos(angle) * distance,
        y: height,
        z: Math.sin(angle) * distance - 100,
        puffCount: Math.floor(40 + Math.random() * 60), // More puffs per cloud
        radius: 25 + Math.random() * 35
      });
    }

    // Medium clouds
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 150;

      clusters.push({
        x: Math.cos(angle) * distance,
        y: 20 + Math.random() * 50,
        z: Math.sin(angle) * distance - 60,
        puffCount: Math.floor(25 + Math.random() * 35),
        radius: 15 + Math.random() * 25
      });
    }

    // Small wisps
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 180;

      clusters.push({
        x: Math.cos(angle) * distance,
        y: 15 + Math.random() * 70,
        z: Math.sin(angle) * distance - 50,
        puffCount: Math.floor(10 + Math.random() * 20),
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
}
