import * as THREE from 'three';
import skyVertexShader from '../shaders/sky.vert.glsl';
import skyFragmentShader from '../shaders/sky.frag.glsl';

export class Sky {
  public mesh: THREE.Mesh;

  constructor() {
    // Create inverted sphere for sky dome
    const geometry = new THREE.SphereGeometry(500, 32, 32);

    const material = new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x6eb5ff) },      // Light sky blue
        uHorizonColor: { value: new THREE.Color(0xffeedd) },   // Pale peachy horizon
        uBottomColor: { value: new THREE.Color(0x88aa77) },    // Greenish (grass reflection)
        uOffset: { value: 0 },
        uExponent: { value: 0.6 }
      },
      side: THREE.BackSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
  }
}
