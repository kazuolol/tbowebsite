import * as THREE from 'three';
import cloudsVertexShader from '../shaders/clouds.vert.glsl';
import cloudsFragmentShader from '../shaders/clouds.frag.glsl';

export class Clouds {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    // Full screen quad that always fills the viewport
    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);

    this.material = new THREE.ShaderMaterial({
      vertexShader: cloudsVertexShader,
      fragmentShader: cloudsFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uCloudColor: { value: new THREE.Color(0xffffff) },
        uSkyColor: { value: new THREE.Color(0x4a90d9) },      // Deeper sky blue
        uCloudScale: { value: 3.0 },
        uCloudSpeed: { value: 0.06 }
      },
      depthWrite: false,
      depthTest: false
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  public update(time: number): void {
    this.material.uniforms.uTime.value = time;
  }
}
