import * as THREE from 'three';
import skyVertexShader from '../shaders/skydome.vert.glsl';
import skyFragmentShader from '../shaders/skydome.frag.glsl';

export class SkyDome {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    // Large inverted sphere for sky
    const geometry = new THREE.SphereGeometry(500, 32, 32);

    this.material = new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: {
        // Dreamcast BIOS ethereal palette - soft pastels
        uSkyTop: { value: new THREE.Color(0xd8e8f0) },       // Very pale blue-white
        uSkyHorizon: { value: new THREE.Color(0xa8d4e8) },   // Soft sky blue
        uSkyBottom: { value: new THREE.Color(0xc0d8e8) },    // Pale misty blue
        uSunIntensity: { value: 0.3 },
        uSunDirection: { value: new THREE.Vector3(0.2, 0.5, -0.6).normalize() }
      },
      side: THREE.BackSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
  }

  public setSunDirection(x: number, y: number, z: number): void {
    this.material.uniforms.uSunDirection.value.set(x, y, z).normalize();
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
