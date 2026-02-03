uniform float uTime;
uniform float uWindStrength;

attribute vec3 offset;
attribute float scale;
attribute float rotation;

varying float vHeight;
varying vec2 vUv;
varying float vColorVariation;

void main() {
  vUv = uv;
  vHeight = uv.y;

  // Create rotation matrix around Y axis
  float cosR = cos(rotation);
  float sinR = sin(rotation);
  mat3 rotationMatrix = mat3(
    cosR, 0.0, sinR,
    0.0, 1.0, 0.0,
    -sinR, 0.0, cosR
  );

  // Apply rotation and scale to local position
  vec3 pos = rotationMatrix * position * scale;

  // Wind animation - stronger at tips (quadratic falloff)
  float windPhase = uTime * 2.0 + offset.x * 0.5 + offset.z * 0.3;
  float windAmount = uWindStrength * vHeight * vHeight;
  pos.x += sin(windPhase) * windAmount;
  pos.z += cos(windPhase * 0.7) * windAmount * 0.5;

  // Secondary wind wave for more natural movement
  float windPhase2 = uTime * 1.3 + offset.x * 0.3 + offset.z * 0.5;
  pos.x += sin(windPhase2) * windAmount * 0.3;

  // Apply instance offset
  vec3 worldPos = pos + offset;

  // Color variation based on position
  vColorVariation = fract(sin(dot(offset.xz, vec2(12.9898, 78.233))) * 43758.5453);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
}
