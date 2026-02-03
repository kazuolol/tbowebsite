import * as THREE from 'three';

export class Ground {
  public mesh: THREE.Mesh;

  constructor() {
    // Simple ground plane beneath the grass
    const geometry = new THREE.PlaneGeometry(100, 100);

    const material = new THREE.MeshBasicMaterial({
      color: 0x3d5c3d, // Dark grass green
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0;
  }
}
