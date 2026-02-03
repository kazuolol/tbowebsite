varying vec2 vUv;

void main() {
  vUv = uv;
  // Render as fullscreen quad - position is already in clip space (-1 to 1)
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
