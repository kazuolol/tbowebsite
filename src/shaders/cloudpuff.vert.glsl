uniform float uTime;

attribute vec3 offset;
attribute float scale;
attribute float brightness;

varying vec2 vUv;
varying float vBrightness;
varying float vFog;
varying float vMorph;

void main() {
  vUv = uv;
  vBrightness = brightness;
  vMorph = 0.0;

  // Billboard: always face camera
  vec3 cameraRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 cameraUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

  // Wind animation - clouds drift across sky
  vec3 animatedOffset = offset;
  animatedOffset.x += uTime * 5.0;

  // Gentle bobbing
  animatedOffset.y += sin(uTime * 0.3 + offset.x * 0.02) * 0.5;

  // Create billboard quad
  vec3 vertexPosition = animatedOffset +
    cameraRight * position.x * scale +
    cameraUp * position.y * scale;

  // Fog based on distance
  vec4 mvPosition = modelViewMatrix * vec4(vertexPosition, 1.0);
  vFog = smoothstep(80.0, 350.0, -mvPosition.z);

  gl_Position = projectionMatrix * mvPosition;
}
