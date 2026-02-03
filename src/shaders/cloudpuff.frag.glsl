uniform vec3 uCloudColor;
uniform vec3 uCloudShadow;
uniform vec3 uSkyColor;

varying vec2 vUv;
varying float vBrightness;
varying float vFog;

void main() {
  // Soft circular falloff for cloud puff
  vec2 center = vUv - 0.5;
  float dist = length(center) * 2.0;

  // Soft edge with noise-like variation
  float edge = 1.0 - smoothstep(0.0, 1.0, dist);
  edge = pow(edge, 1.5);

  // Add some internal variation
  float variation = sin(vUv.x * 12.0) * sin(vUv.y * 12.0) * 0.1 + 0.9;
  edge *= variation;

  if (edge < 0.01) discard;

  // Cloud color with brightness variation
  vec3 color = mix(uCloudShadow, uCloudColor, vBrightness);

  // Add subtle rim lighting
  float rim = smoothstep(0.3, 0.7, dist) * (1.0 - smoothstep(0.7, 1.0, dist));
  color += vec3(0.1) * rim * vBrightness;

  // Fog fade to sky
  color = mix(color, uSkyColor, vFog * 0.7);
  float alpha = edge * (1.0 - vFog * 0.5);

  gl_FragColor = vec4(color, alpha * 0.85);
}
