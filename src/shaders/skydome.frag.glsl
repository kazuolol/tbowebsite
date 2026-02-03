varying vec3 vWorldPosition;
varying vec2 vUv;

uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyBottom;
uniform float uSunIntensity;
uniform vec3 uSunDirection;

void main() {
  vec3 direction = normalize(vWorldPosition);
  float height = direction.y;

  // Sky gradient
  vec3 color;
  if (height > 0.0) {
    // Above horizon - blend from horizon to top
    float t = pow(height, 0.7);
    color = mix(uSkyHorizon, uSkyTop, t);
  } else {
    // Below horizon - blend to bottom color
    float t = pow(-height, 0.5);
    color = mix(uSkyHorizon, uSkyBottom, t);
  }

  // Sun glow
  float sunDot = max(dot(direction, uSunDirection), 0.0);
  float sunGlow = pow(sunDot, 32.0) * uSunIntensity;
  float sunHalo = pow(sunDot, 4.0) * uSunIntensity * 0.3;

  color += vec3(1.0, 0.95, 0.8) * sunGlow;
  color += vec3(1.0, 0.9, 0.7) * sunHalo;

  // Atmospheric scattering near horizon
  float horizonGlow = 1.0 - abs(height);
  horizonGlow = pow(horizonGlow, 3.0) * 0.15;
  color += vec3(1.0, 0.95, 0.9) * horizonGlow;

  gl_FragColor = vec4(color, 1.0);
}
