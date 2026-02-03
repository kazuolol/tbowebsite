uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform vec3 uDarkColor;

varying float vHeight;
varying vec2 vUv;
varying float vColorVariation;

void main() {
  // Blade shape - simple alpha cutoff for grass blade silhouette
  float centerDist = abs(vUv.x - 0.5) * 2.0;
  float bladeWidth = 1.0 - vHeight * 0.7; // Narrower at tip
  float alpha = 1.0 - smoothstep(bladeWidth * 0.4, bladeWidth * 0.5, centerDist);

  if (alpha < 0.5) discard;

  // Base to tip gradient (fake ambient occlusion)
  vec3 color = mix(uBaseColor, uTipColor, smoothstep(0.0, 0.7, vHeight));

  // Add color variation
  vec3 variedColor = mix(color, uDarkColor, vColorVariation * 0.3);

  // Cel-shading: quantize brightness to 3 levels
  float brightness = (variedColor.r + variedColor.g + variedColor.b) / 3.0;
  float quantized = floor(brightness * 3.0 + 0.5) / 3.0;
  float adjustment = quantized / max(brightness, 0.001);
  vec3 celColor = variedColor * adjustment;

  // Soften the cel-shading effect
  vec3 finalColor = mix(variedColor, celColor, 0.6);

  // Slightly brighter at the very tip
  finalColor += vec3(0.05) * smoothstep(0.8, 1.0, vHeight);

  gl_FragColor = vec4(finalColor, 1.0);
}
