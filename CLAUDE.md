# The Big One Website

Early access signup page for "The Big One" - a 3D landing page with a terminal-style email/OTP signup flow.

## Tech Stack

- **Framework**: Vite + TypeScript
- **3D Graphics**: Three.js
- **Shaders**: GLSL (via vite-plugin-glsl)
- **Fonts**: Jost (Google Fonts)

## Project Structure

```
src/
├── main.ts              # Entry point - initializes SceneManager and Terminal
├── style.css            # Global styles including terminal UI
├── scene/
│   └── SceneManager.ts  # Three.js scene setup, camera, animation loop
├── environment/
│   ├── SkyDome.ts       # Gradient sky background
│   ├── Clouds3D.ts      # Animated 3D cloud system
│   ├── Grass.ts         # (unused) Grass rendering
│   ├── Ground.ts        # (unused) Ground plane
│   └── Sky.ts           # (unused) Alternative sky
├── ui/
│   ├── Terminal.ts      # Main terminal UI with state machine (intro→email→otp→success)
│   └── Typewriter.ts    # Typewriter text effect
└── shaders/
    ├── skydome.vert.glsl / skydome.frag.glsl
    ├── cloudpuff.vert.glsl / cloudpuff.frag.glsl
    └── (other unused shaders)
```

## Development

```bash
npm run dev      # Start dev server
npm run build    # TypeScript check + production build
npm run preview  # Preview production build
```

## Architecture

### SceneManager
- Creates Three.js scene with PerspectiveCamera
- Manages SkyDome and Clouds3D components
- Runs animation loop with gentle camera sway

### Terminal
State machine flow:
1. `intro` - ASCII logo + typewriter welcome
2. `email` - Email input capture
3. `otp` - 6-digit OTP verification
4. `success` - Queue confirmation with progress bar

### Shaders
- Custom GLSL shaders loaded via vite-plugin-glsl
- SkyDome uses gradient shader
- Clouds3D uses billboard cloud puff shader with noise

## Notes

- Terminal currently simulates OTP verification (no backend)
- Queue position is hardcoded (#2,847)
- Some environment components (Grass, Ground, Sky) are unused but kept for potential future use
