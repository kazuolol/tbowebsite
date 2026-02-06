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
│   ├── SceneManager.ts  # Three.js scene setup, camera, animation loop
│   └── FallingScene.ts  # Main 3D scene - emissive floating cubes + character
├── environment/
│   ├── FallingCharacter.ts  # Animated FBX character with outfit/hair variants
│   ├── SkyDome.ts           # Gradient sky background
│   ├── Clouds3D.ts          # Animated 3D cloud system
│   ├── WireframeCharacter.ts # Wireframe variant of character
│   └── (unused: Grass, Ground, Sky, FloatingCubes, WireframeCity, etc.)
├── ui/
│   ├── Terminal.ts      # Main terminal UI with state machine (intro→email→otp→success)
│   ├── Typewriter.ts    # Typewriter text effect
│   ├── Modal.ts         # Modal component
│   └── SignupFlow.ts    # Signup flow UI
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

### FallingScene (main 3D scene)
- 150 procedural emissive cubes floating toward camera at speed 12
- Cubes use `MeshStandardMaterial` with icy white-blue color (`0xddeeff`) and emissive glow
- Weighted size distribution: 50% small (0.3-2.3), 35% medium (2-8), 15% large (8-28)
- Smaller cubes spin faster, large ones barely rotate
- ACES filmic tone mapping, exponential fog (`0xcccccc`, density 0.005)
- White glow sprite at center behind cubes (`renderOrder: -1`)
- Small cube fragments spawn near camera and fade out
- FOV breathing: `75 + sin(elapsed * 0.15) * 2`

### FallingCharacter
- Loads FBX model (`YoughFemale_Rig.fbx`) with jump loop animation
- Random outfit (2-6, skips 001/underwear), random hair (1-5), random hair color
- Y-axis spin at 1.2 rad/s
- Outfit/hair visibility filtering via mesh name regex matching
- Retargets animation clips to model bone hierarchy

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

## Deployment

- **Hosting**: Cloudflare Pages
- **Project name**: `tbowebsite`
- **Production URL**: https://tbowebsite-7sj.pages.dev/
- **Takedown command**: `npx wrangler pages project delete tbowebsite`
- **Redeploy**: `npm run build && npx wrangler pages deploy dist --project-name tbowebsite`

## Notes

- Terminal currently simulates OTP verification (no backend)
- Queue position is hardcoded (#2,847)
- Many environment components are unused but kept for potential future use
- Character outfit 001 (underwear/bikini) is excluded from random selection
