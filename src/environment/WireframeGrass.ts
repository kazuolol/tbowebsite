import * as THREE from 'three';

interface GrassChunk {
  x: number;
  z: number;
  mesh: THREE.LineSegments;
}

export class WireframeGrass {
  private scene: THREE.Scene;
  private material: THREE.LineBasicMaterial;
  private chunks: Map<string, GrassChunk> = new Map();
  private chunkSize: number = 30;
  private bladesPerChunk: number = 400;
  private loadRadius: number = 4;

  constructor(scene: THREE.Scene, material: THREE.LineBasicMaterial) {
    this.scene = scene;
    this.material = material;
  }

  update(cameraZ: number, elapsed: number): void {
    const currentChunkZ = Math.floor(-cameraZ / this.chunkSize);

    // Load chunks around camera
    for (let dz = -1; dz <= this.loadRadius; dz++) {
      for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
        const chunkX = dx;
        const chunkZ = currentChunkZ + dz;
        const key = `${chunkX},${chunkZ}`;

        if (!this.chunks.has(key)) {
          this.loadChunk(chunkX, chunkZ);
        }
      }
    }

    // Unload chunks far behind camera
    const keysToRemove: string[] = [];
    for (const [key, chunk] of this.chunks) {
      if (chunk.z < currentChunkZ - 2) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.unloadChunk(key);
    }

    // Animate grass sway
    this.animateGrass(elapsed);
  }

  private loadChunk(chunkX: number, chunkZ: number): void {
    const key = `${chunkX},${chunkZ}`;
    const positions: number[] = [];

    // Deterministic random based on chunk position
    const seed = chunkX * 10000 + chunkZ;
    const random = this.seededRandom(seed);

    for (let i = 0; i < this.bladesPerChunk; i++) {
      // Random position within chunk
      const x = (chunkX + random() - 0.5) * this.chunkSize;
      const z = -(chunkZ + random()) * this.chunkSize;

      // Create grass blade (simple triangle or line)
      const bladeHeight = 0.3 + random() * 0.7;
      const bladeWidth = 0.05 + random() * 0.1;
      const lean = (random() - 0.5) * 0.3; // Slight random lean

      // Grass blade as 3 lines forming a triangle
      const baseLeft = x - bladeWidth / 2;
      const baseRight = x + bladeWidth / 2;
      const tipX = x + lean;
      const tipY = bladeHeight;

      // Left edge
      positions.push(baseLeft, 0, z, tipX, tipY, z);
      // Right edge
      positions.push(baseRight, 0, z, tipX, tipY, z);
      // Base (optional, makes it denser)
      // positions.push(baseLeft, 0, z, baseRight, 0, z);

      // Add some variation - occasional taller grass
      if (random() > 0.85) {
        const tallHeight = bladeHeight + 0.3 + random() * 0.5;
        const tallX = x + (random() - 0.5) * 0.1;
        const tallZ = z + (random() - 0.5) * 0.1;
        positions.push(tallX, 0, tallZ, tallX + lean * 0.5, tallHeight, tallZ);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    // Store original positions for animation
    geometry.userData.originalPositions = new Float32Array(positions);

    const mesh = new THREE.LineSegments(geometry, this.material);
    this.scene.add(mesh);

    this.chunks.set(key, { x: chunkX, z: chunkZ, mesh });
  }

  private unloadChunk(key: string): void {
    const chunk = this.chunks.get(key);
    if (!chunk) return;

    this.scene.remove(chunk.mesh);
    chunk.mesh.geometry.dispose();
    this.chunks.delete(key);
  }

  private animateGrass(elapsed: number): void {
    // Gentle wind sway animation
    const windStrength = 0.15;
    const windSpeed = 1.5;

    for (const [, chunk] of this.chunks) {
      const geometry = chunk.mesh.geometry;
      const positions = geometry.getAttribute('position');
      const original = geometry.userData.originalPositions as Float32Array;

      if (!original) continue;

      for (let i = 0; i < positions.count; i++) {
        const origX = original[i * 3];
        const origY = original[i * 3 + 1];
        const origZ = original[i * 3 + 2];

        // Only sway the top vertices (y > 0)
        if (origY > 0.1) {
          const swayAmount = origY * windStrength;
          const phase = origX * 0.5 + origZ * 0.3 + elapsed * windSpeed;
          const sway = Math.sin(phase) * swayAmount;

          positions.setX(i, origX + sway);
          positions.setZ(i, origZ + Math.cos(phase * 0.7) * swayAmount * 0.3);
        }
      }

      positions.needsUpdate = true;
    }
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  getChunkCount(): number {
    return this.chunks.size;
  }

  dispose(): void {
    for (const [key] of this.chunks) {
      this.unloadChunk(key);
    }
  }
}
