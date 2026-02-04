uniform vec3 uCloudColor;
uniform vec3 uCloudShadow;
uniform vec3 uSkyColor;
uniform float uTime;

varying vec2 vUv;
varying float vBrightness;
varying float vFog;
varying float vMorph;

void main() {
  vec2 uv = vUv;
  vec2 center = uv - 0.5;

  // Soft circular falloff - gaussian-like
  float dist = length(center) * 2.0;
  float alpha = exp(-dist * dist * 3.0);

  // Very soft edges
  alpha = smoothstep(0.0, 0.1, alpha) * alpha;

  if (alpha < 0.01) discard;

  // Cloud color
  vec3 color = mix(uCloudShadow, uCloudColor, vBrightness);

  // Fog fade
  color = mix(color, uSkyColor, vFog * 0.6);
  alpha *= (1.0 - vFog * 0.4) * 0.6;

  gl_FragColor = vec4(color, alpha);
}
