uniform float uTime;
uniform vec3 uCloudColor;
uniform vec3 uSkyColor;
uniform float uCloudScale;
uniform float uCloudSpeed;

varying vec2 vUv;

// Hash functions for noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 6; i++) {
    value += amplitude * noise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

void main() {
  vec2 uv = vUv;

  // Aspect ratio correction for uniform clouds
  float aspect = 16.0 / 9.0;
  vec2 scaledUv = vec2(uv.x * aspect, uv.y);

  // Slow movement
  float time = uTime * uCloudSpeed;
  vec2 movement = vec2(time, time * 0.3);

  // Multiple cloud layers at different scales and speeds
  float clouds1 = fbm((scaledUv + movement) * uCloudScale);
  float clouds2 = fbm((scaledUv * 0.5 + movement * 0.7) * uCloudScale);
  float clouds3 = fbm((scaledUv * 2.0 + movement * 1.3) * uCloudScale * 0.5);

  // Combine layers with different weights
  float clouds = clouds1 * 0.6 + clouds2 * 0.3 + clouds3 * 0.2;

  // Create cloud shapes - adjust threshold for coverage
  float cloudMask = smoothstep(0.35, 0.65, clouds);

  // Add fluffy edges
  float edges = fbm((scaledUv + movement * 0.8) * uCloudScale * 4.0);
  cloudMask += edges * 0.1 * cloudMask;

  // Sky gradient - lighter at horizon, deeper blue at top
  vec3 skyTop = vec3(0.25, 0.5, 0.85);      // Deep blue
  vec3 skyHorizon = vec3(0.6, 0.8, 0.95);   // Light blue
  vec3 skyGradient = mix(skyHorizon, skyTop, uv.y);

  // Cloud shading - brighter tops, slightly darker bottoms
  vec3 cloudLight = vec3(1.0, 1.0, 1.0);
  vec3 cloudShadow = vec3(0.85, 0.88, 0.95);

  // Use noise to vary cloud brightness
  float cloudShade = fbm((scaledUv + movement * 0.5) * uCloudScale * 2.0);
  vec3 cloudColor = mix(cloudShadow, cloudLight, smoothstep(0.3, 0.7, cloudShade));

  // Add subtle warm highlight on cloud tops
  float topLight = smoothstep(0.5, 0.8, clouds) * (1.0 - uv.y * 0.3);
  cloudColor += vec3(0.05, 0.03, 0.0) * topLight;

  // Mix sky and clouds
  vec3 color = mix(skyGradient, cloudColor, cloudMask);

  // Add atmospheric haze near bottom
  float haze = (1.0 - uv.y) * 0.15;
  color = mix(color, vec3(0.75, 0.85, 0.95), haze);

  // Subtle vignette
  float vignette = 1.0 - length((uv - 0.5) * 0.8);
  vignette = smoothstep(0.2, 1.0, vignette);
  color *= 0.9 + vignette * 0.1;

  gl_FragColor = vec4(color, 1.0);
}
