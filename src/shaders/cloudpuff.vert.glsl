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

  // Fly-through: clouds move toward camera and wrap around
  float flySpeed = 15.0;
  float fieldDepth = 500.0;  // Total depth of cloud field
  float fieldStart = -350.0; // Where clouds spawn (far ahead)

  vec3 animatedOffset = offset;

  // Move clouds toward camera (increasing Z)
  float zOffset = mod(offset.z - fieldStart + uTime * flySpeed, fieldDepth) + fieldStart;
  animatedOffset.z = zOffset;

  // Slight horizontal drift for variety
  animatedOffset.x += sin(uTime * 0.1 + offset.x * 0.01) * 2.0;

  // Gentle bobbing
  animatedOffset.y += sin(uTime * 0.3 + offset.x * 0.02) * 0.5;

  // Create billboard quad
  vec3 vertexPosition = animatedOffset +
    cameraRight * position.x * scale +
    cameraUp * position.y * scale;

  // Fog based on distance - extended for fly-through
  vec4 mvPosition = modelViewMatrix * vec4(vertexPosition, 1.0);
  vFog = smoothstep(100.0, 450.0, -mvPosition.z);

  gl_Position = projectionMatrix * mvPosition;
}
