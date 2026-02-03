varying vec3 vWorldPosition;

uniform vec3 uTopColor;
uniform vec3 uHorizonColor;
uniform vec3 uBottomColor;
uniform float uOffset;
uniform float uExponent;

void main() {
  float h = normalize(vWorldPosition + uOffset).y;

  // Create gradient with anime-style subtle banding
  vec3 color;
  if (h > 0.0) {
    // Sky gradient (horizon to top)
    float t = pow(h, uExponent);
    color = mix(uHorizonColor, uTopColor, t);

    // Subtle banding for anime effect
    float bands = floor(t * 8.0) / 8.0;
    color = mix(color, mix(uHorizonColor, uTopColor, bands), 0.15);
  } else {
    // Below horizon (greenish tint for grass reflection)
    float t = pow(-h, 0.5);
    color = mix(uHorizonColor, uBottomColor, t);
  }

  gl_FragColor = vec4(color, 1.0);
}
