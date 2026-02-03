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
        uSkyTop: { value: new THREE.Color(0x1e5799) },       // Deep blue
        uSkyHorizon: { value: new THREE.Color(0x7ec0ee) },   // Light sky blue
        uSkyBottom: { value: new THREE.Color(0x9dc4d4) },    // Pale blue-gray
        uSunIntensity: { value: 0.6 },
        uSunDirection: { value: new THREE.Vector3(0.5, 0.3, -0.8).normalize() }
      },
      side: THREE.BackSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
  }

  public setSunDirection(x: number, y: number, z: number): void {
    this.material.uniforms.uSunDirection.value.set(x, y, z).normalize();
  }
}
