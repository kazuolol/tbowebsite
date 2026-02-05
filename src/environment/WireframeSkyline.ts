import * as THREE from 'three';

interface FloatingShape {
  mesh: THREE.LineSegments;
  rotationSpeed: THREE.Vector3;
  driftSpeed: number;
}

export class WireframeSkyline {
  private scene: THREE.Scene;
  private material: THREE.LineBasicMaterial;
  private skylineGroup: THREE.Group;
  private floatingShapes: FloatingShape[] = [];

  constructor(scene: THREE.Scene, material: THREE.LineBasicMaterial) {
    this.scene = scene;
    this.material = material.clone();
    this.material.transparent = true;
    this.material.opacity = 0.35;

    this.skylineGroup = new THREE.Group();
    this.createCity();
    this.createFloatingShapes();
    this.scene.add(this.skylineGroup);
  }

  private createCity(): void {
    const cityGroup = new THREE.Group();
    const baseZ = -130;
    const baseY = 0;

    // === CENTRAL SKYSCRAPERS (tallest buildings in center) ===
    this.addBuilding(cityGroup, 0, baseY, baseZ, 8, 55, 6);
    this.addBuilding(cityGroup, -12, baseY, baseZ + 2, 6, 48, 5);
    this.addBuilding(cityGroup, 10, baseY, baseZ - 2, 7, 52, 5);
    this.addBuilding(cityGroup, -6, baseY, baseZ + 5, 5, 42, 4);
    this.addBuilding(cityGroup, 5, baseY, baseZ + 4, 6, 45, 5);

    // === SECONDARY TALL BUILDINGS ===
    this.addBuilding(cityGroup, -22, baseY, baseZ + 5, 5, 38, 4);
    this.addBuilding(cityGroup, 20, baseY, baseZ + 3, 6, 40, 5);
    this.addBuilding(cityGroup, -16, baseY, baseZ + 8, 4, 35, 4);
    this.addBuilding(cityGroup, 16, baseY, baseZ + 7, 5, 36, 4);
    this.addBuilding(cityGroup, -8, baseY, baseZ + 10, 4, 32, 3);
    this.addBuilding(cityGroup, 8, baseY, baseZ + 9, 4, 30, 4);

    // === MID-HEIGHT BUILDINGS ===
    this.addBuilding(cityGroup, -30, baseY, baseZ + 10, 5, 28, 4);
    this.addBuilding(cityGroup, 28, baseY, baseZ + 8, 4, 26, 4);
    this.addBuilding(cityGroup, -25, baseY, baseZ + 14, 4, 24, 3);
    this.addBuilding(cityGroup, 24, baseY, baseZ + 12, 5, 25, 4);
    this.addBuilding(cityGroup, 0, baseY, baseZ + 15, 4, 22, 3);
    this.addBuilding(cityGroup, -14, baseY, baseZ + 16, 3, 20, 3);
    this.addBuilding(cityGroup, 14, baseY, baseZ + 15, 4, 22, 3);

    // === SMALLER BUILDINGS (edges of city) ===
    this.addBuilding(cityGroup, -38, baseY, baseZ + 15, 4, 18, 3);
    this.addBuilding(cityGroup, 36, baseY, baseZ + 14, 3, 16, 3);
    this.addBuilding(cityGroup, -42, baseY, baseZ + 18, 3, 14, 3);
    this.addBuilding(cityGroup, 40, baseY, baseZ + 17, 4, 15, 3);
    this.addBuilding(cityGroup, -34, baseY, baseZ + 20, 3, 12, 2);
    this.addBuilding(cityGroup, 32, baseY, baseZ + 19, 3, 13, 3);

    // === DISTANT LOW BUILDINGS ===
    this.addBuilding(cityGroup, -48, baseY, baseZ + 22, 3, 10, 2);
    this.addBuilding(cityGroup, 46, baseY, baseZ + 21, 3, 11, 2);
    this.addBuilding(cityGroup, -52, baseY, baseZ + 25, 2, 8, 2);
    this.addBuilding(cityGroup, 50, baseY, baseZ + 24, 3, 9, 2);

    this.skylineGroup.add(cityGroup);
  }

  private addBuilding(group: THREE.Group, x: number, y: number, z: number, width: number, height: number, depth: number): void {
    const positions: number[] = [];
    const hw = width / 2;
    const hd = depth / 2;

    // Base rectangle
    positions.push(-hw, 0, -hd, hw, 0, -hd);
    positions.push(hw, 0, -hd, hw, 0, hd);
    positions.push(hw, 0, hd, -hw, 0, hd);
    positions.push(-hw, 0, hd, -hw, 0, -hd);

    // Top rectangle
    positions.push(-hw, height, -hd, hw, height, -hd);
    positions.push(hw, height, -hd, hw, height, hd);
    positions.push(hw, height, hd, -hw, height, hd);
    positions.push(-hw, height, hd, -hw, height, -hd);

    // Vertical edges (corners)
    positions.push(-hw, 0, -hd, -hw, height, -hd);
    positions.push(hw, 0, -hd, hw, height, -hd);
    positions.push(hw, 0, hd, hw, height, hd);
    positions.push(-hw, 0, hd, -hw, height, hd);

    // Window floor lines (horizontal bands)
    const floorHeight = 4;
    const floors = Math.floor(height / floorHeight);
    for (let i = 1; i < floors; i++) {
      const fy = i * floorHeight;
      // Front and back
      positions.push(-hw, fy, hd, hw, fy, hd);
      positions.push(-hw, fy, -hd, hw, fy, -hd);
    }

    // Vertical window divisions on front face
    const divisions = Math.max(2, Math.floor(width / 2));
    for (let i = 1; i < divisions; i++) {
      const dx = -hw + (i / divisions) * width;
      positions.push(dx, 0, hd, dx, height, hd);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const building = new THREE.LineSegments(geometry, this.material);
    building.position.set(x, y, z);
    group.add(building);
  }

  private createFloatingShapes(): void {
    // Create scattered floating cubes in the sky
    const shapeCount = 35;

    for (let i = 0; i < shapeCount; i++) {
      // Random position - some high in sky, some lower near ground
      const x = (Math.random() - 0.5) * 200;
      const y = Math.random() < 0.3
        ? 3 + Math.random() * 10   // Low cubes (near ground)
        : 15 + Math.random() * 50; // High cubes (in sky)
      const z = -20 - Math.random() * 150;

      // Random size - mostly small, some larger
      const size = Math.random() < 0.8
        ? 0.4 + Math.random() * 0.6  // Small cubes
        : 1.2 + Math.random() * 1.2; // Larger cubes

      // All cubes - uniform shape
      const geometry = this.createCubeGeometry(size);

      // Create material with slight opacity variation
      const shapeMaterial = this.material.clone();
      shapeMaterial.opacity = 0.25 + Math.random() * 0.2;

      const mesh = new THREE.LineSegments(geometry, shapeMaterial);
      mesh.position.set(x, y, z);

      // Random initial rotation
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.skylineGroup.add(mesh);

      this.floatingShapes.push({
        mesh,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        driftSpeed: 0.3 + Math.random() * 0.5
      });
    }
  }

  private createCubeGeometry(size: number): THREE.BufferGeometry {
    const positions: number[] = [];
    const s = size / 2;

    // 12 edges of a cube
    // Bottom face
    positions.push(-s, -s, -s, s, -s, -s);
    positions.push(s, -s, -s, s, -s, s);
    positions.push(s, -s, s, -s, -s, s);
    positions.push(-s, -s, s, -s, -s, -s);

    // Top face
    positions.push(-s, s, -s, s, s, -s);
    positions.push(s, s, -s, s, s, s);
    positions.push(s, s, s, -s, s, s);
    positions.push(-s, s, s, -s, s, -s);

    // Vertical edges
    positions.push(-s, -s, -s, -s, s, -s);
    positions.push(s, -s, -s, s, s, -s);
    positions.push(s, -s, s, s, s, s);
    positions.push(-s, -s, s, -s, s, s);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }

  update(elapsed: number, cameraZ: number): void {
    // Keep skyline at fixed distance ahead of camera
    this.skylineGroup.position.z = cameraZ;

    // Animate floating shapes
    for (const shape of this.floatingShapes) {
      // Gentle rotation
      shape.mesh.rotation.x += shape.rotationSpeed.x * 0.01;
      shape.mesh.rotation.y += shape.rotationSpeed.y * 0.01;
      shape.mesh.rotation.z += shape.rotationSpeed.z * 0.01;

      // Drift upward slowly
      shape.mesh.position.y += shape.driftSpeed * 0.008;

      // Respawn at bottom when too high
      if (shape.mesh.position.y > 70) {
        shape.mesh.position.y = 2 + Math.random() * 5;
        shape.mesh.position.x = (Math.random() - 0.5) * 200;
        shape.mesh.position.z = -20 - Math.random() * 150;
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.skylineGroup);
    this.skylineGroup.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    this.material.dispose();
  }
}
