uniform float uTime;

attribute vec3 offset;
attribute float scale;
attribute float brightness;

varying vec2 vUv;
varying float vBrightness;
varying float vFog;

void main() {
  vUv = uv;
  vBrightness = brightness;

  // Billboard: always face camera
  vec3 cameraRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 cameraUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

  // Offset position with subtle animation
  vec3 animatedOffset = offset;
  animatedOffset.x += sin(uTime * 0.1 + offset.z * 0.1) * 2.0;
  animatedOffset.z += cos(uTime * 0.08 + offset.x * 0.1) * 1.5;

  // Create billboard quad
  vec3 vertexPosition = animatedOffset +
    cameraRight * position.x * scale +
    cameraUp * position.y * scale;

  // Fog based on distance
  vec4 mvPosition = modelViewMatrix * vec4(vertexPosition, 1.0);
  vFog = smoothstep(100.0, 400.0, -mvPosition.z);

  gl_Position = projectionMatrix * mvPosition;
}
