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
    // Generate cloud cluster positions
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
        uCloudShadow: { value: new THREE.Color(0xb8c6d4) },
        uSkyColor: { value: new THREE.Color(0x7ec0ee) }
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending
    });

    this.mesh = new THREE.InstancedMesh(geometry, this.material, totalPuffs);
    this.mesh.frustumCulled = false;

    // Generate puff instances
    this.generatePuffs(clusters, totalPuffs);
  }

  private generateClusters(): CloudCluster[] {
    const clusters: CloudCluster[] = [];
    const clusterCount = 25;

    for (let i = 0; i < clusterCount; i++) {
      // Distribute clouds in a dome pattern
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 200;
      const height = 30 + Math.random() * 80;

      clusters.push({
        x: Math.cos(angle) * distance,
        y: height,
        z: Math.sin(angle) * distance - 100, // Bias towards front
        puffCount: Math.floor(15 + Math.random() * 25),
        radius: 15 + Math.random() * 25
      });
    }

    // Add some closer, larger clouds
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 60;

      clusters.push({
        x: Math.cos(angle) * distance,
        y: 20 + Math.random() * 40,
        z: Math.sin(angle) * distance - 50,
        puffCount: Math.floor(25 + Math.random() * 35),
        radius: 20 + Math.random() * 30
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
        // Distribute puffs within cluster using spherical distribution
        // but flattened vertically for cloud-like shape
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.pow(Math.random(), 0.5) * cluster.radius;

        const localX = r * Math.sin(phi) * Math.cos(theta);
        const localY = r * Math.sin(phi) * Math.sin(theta) * 0.4; // Flatten
        const localZ = r * Math.cos(phi);

        offsets[puffIndex * 3] = cluster.x + localX;
        offsets[puffIndex * 3 + 1] = cluster.y + localY;
        offsets[puffIndex * 3 + 2] = cluster.z + localZ;

        // Larger puffs at center, smaller at edges
        const distFromCenter = Math.sqrt(localX * localX + localY * localY + localZ * localZ) / cluster.radius;
        scales[puffIndex] = (8 + Math.random() * 12) * (1.2 - distFromCenter * 0.5);

        // Brighter on top, darker on bottom
        const heightInCluster = (localY + cluster.radius * 0.4) / (cluster.radius * 0.8);
        brightnesses[puffIndex] = 0.6 + Math.min(1.0, heightInCluster) * 0.4 + Math.random() * 0.1;

        // Set dummy matrix (required by InstancedMesh)
        this.mesh.setMatrixAt(puffIndex, dummy);

        puffIndex++;
      }
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
      'brightness',
      new THREE.InstancedBufferAttribute(brightnesses, 1)
    );
  }

  public update(time: number): void {
    this.material.uniforms.uTime.value = time;
  }
}
