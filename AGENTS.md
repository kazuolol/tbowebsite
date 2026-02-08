# Agent Guidelines for The Big One Website

This document provides architectural context and working rules for AI agents in this repo.

## Project Overview

A 3D landing page for "The Big One" MMORPG early access. The current live experience is:
- A Three.js falling scene with floating emissive cubes and rotating character variants
- A Dreamcast BIOS-inspired HTML/CSS menu overlay

## Tech Stack

- Vite (dev server and build)
- TypeScript (strict mode)
- Three.js
- GLSL via `vite-plugin-glsl`

## Current Runtime Snapshot

These details are important because older docs in the repo may describe a different flow.

- `src/main.ts` instantiates `FallingScene` and `MainMenu`
- The active UI class is `MainMenu` (not `DreamcastMenu`)
- `MainMenu` renders a header extension CTA: `Claim Early Access`
- Main menu currently renders three left-rail buttons: `GlobaNet`, `B-mail`, `Social`
- `MainMenu` publishes weather updates via `tbo:local-weather-update`, consumed by `FallingScene`
- `FallingScene` also instantiates `CharacterOrbitCarousel` (in-world orbiting action buttons around the active character)

## Architecture Principles

### Scene and Environment Pattern

The codebase follows a clear separation:

`Scene (orchestrator) -> Environment components (individual 3D elements)`

- Scenes in `src/scene/` manage camera, lights, animation loop, and high-level coordination
- Environment components in `src/environment/` encapsulate object logic and lifecycle

Each environment component should:
1. Accept a `THREE.Scene` in the constructor
2. Expose `update(delta: number)` for animation work
3. Expose `dispose()` for cleanup
4. Manage its own materials, geometry, and texture disposal

### UI Layer

HTML/CSS overlays in `src/ui/` are separate from the WebGL canvas. The UI root sits above the scene canvas.

### Menu Icon Rendering Pattern

`MenuIcon3D` currently has two render paths:

- Offscreen canvas path: `MainMenu` uses a shared offscreen `THREE.WebGLRenderer`, and each icon is drawn into its own display canvas.
- Mounted scene path: `CharacterOrbitCarousel` calls `MenuIcon3D.mountToObject()` so icon meshes/lights are mounted directly into the main scene and animated by `MenuIcon3D.update()` without offscreen canvas blitting.

- MainMenu offscreen render size constant: `src/ui/MainMenu.ts` `ICON_RENDER_SIZE`
- MainMenu friends icon render size override: `src/ui/MainMenu.ts` `FRIENDS_ICON_RENDER_SIZE`
- In-world carousel icon/button size constants: `src/environment/CharacterOrbitCarousel.ts` (`ICON_DISPLAY_SIZE_PX`, `BUTTON_WIDTH_PX`, `BUTTON_HEIGHT_PX`)
- CSS display size: `.dc-menu-btn-icon` and `.dc-menu-btn-icon canvas` in `src/style.css`
- In-world icon sizing is world-space driven: carousel creates a tiny placeholder canvas for `MenuIcon3D` and then fits mounted icon bounds to target world size in `CharacterOrbitCarousel.fitIconToTargetSize()`

When resizing MainMenu icons, update render constants and CSS together to avoid blur, clipping, or inconsistent scale. When resizing in-world icons, update `CharacterOrbitCarousel` size and hitbox constants together.

### Asset Loading

- Models: `public/models/` (FBX)
- Textures: `public/textures/` (JPG/PNG)
- Use Three.js loaders (`FBXLoader`, `TextureLoader`)

## Active Scene Notes

### FallingScene

- Spawns and recycles many emissive cubes moving toward the camera
- Uses ACES tone mapping, fog, and fragment-like cube particles near the camera
- Delegates character logic to `CharacterPool`
- Updates `CharacterOrbitCarousel` each frame and disposes it during scene teardown

### CharacterOrbitCarousel

- Lives at `src/environment/CharacterOrbitCarousel.ts`
- Anchors to `CharacterPool.getActiveCharacterOrbitAnchor()` and hides itself until a character is active
- Renders three in-world orbiting action buttons (`play`, `inbox`, `friends`) with labels `GlobaNet`, `B-mail`, `Social`
- Uses `MenuIcon3D.mountToObject()` so icons render directly in the main scene (layer-gated to `ORBIT_LAYER = 2`)
- Uses invisible hit meshes + `THREE.Raycaster` from scene canvas pointer events for hover/click
- Dispatches `tbo:menu-action` with `{ action, label }` on click
- Clicked item highlight state is sticky (`activeIndex`) and stays active until another item is clicked or the carousel is disposed

### CharacterPool

- Preloads female and male models, textures, and animation clips
- Creates a pool of 10 preconfigured variants (gender + hair + outfit + hair color)
- Cycles characters after a minimum rotation count
- Uses clip-plane dissolve plus disintegration particles for transitions

## Key Gotchas

### FBX Texture Mapping

When loading FBX materials:

1. `texture.flipY = true` is required for FBX UVs in this project
2. Preserve UV transform fields when replacing maps
3. Normalize names with `.toLowerCase()` for matching

```typescript
texture.flipY = true;
texture.colorSpace = THREE.SRGBColorSpace;
```

### Material Replacement

When cloning/replacing maps, preserve UV transforms:

```typescript
if (origMat.map) {
  newTexture.offset.copy(origMat.map.offset);
  newTexture.repeat.copy(origMat.map.repeat);
  newTexture.rotation = origMat.map.rotation;
  newTexture.center.copy(origMat.map.center);
}
```

### Character Variants

`FallingCharacter` supports:
- Hair variants `001` through `005`
- Female outfits `001` through `006`
- Male outfits currently selected from `001`, `002`, `004`, `005` in pool generation
- Body cut meshes that must match selected outfit IDs

### Memory Management

Always ensure `dispose()` methods:
- Remove objects from scene
- Dispose geometries
- Dispose materials and textures
- Clear arrays and references

### Orbit Layer Wiring

`CharacterOrbitCarousel` depends on consistent layer setup for both rendering and pointer picking:

- Camera must have `ORBIT_LAYER` enabled
- Carousel meshes/hit meshes must be on `ORBIT_LAYER`
- Raycaster used for hover/click must target `ORBIT_LAYER`

If these drift, orbit buttons can disappear, render incorrectly, or stop receiving hover/click hits.

## File Organization

```text
src/
  main.ts
  style.css
  scene/
    FallingScene.ts          # Active scene
  environment/
    CharacterPool.ts         # Active character orchestration
    CharacterOrbitCarousel.ts # In-world orbiting action menu
    FallingCharacter.ts      # Active character variant/material logic
    *.ts                     # Other components, some unused by current entrypoint
  ui/
    MainMenu.ts              # Active UI overlay
    MenuIcon3D.ts            # 3D icon renderer + icon models/animation
    WeatherIcons2D.ts        # Weather icon canvas renderer
  shaders/
    *.glsl
  utils/
    *.ts
```

## Testing and Verification

```bash
npm run dev
npm run build
```

Check browser console for:
- `No texture for material:` warnings
- Three.js disposal warnings
- WebGL errors

## Common Tasks

### Add a New Environment Component

1. Create class in `src/environment/`
2. Accept `THREE.Scene` in constructor
3. Implement `update(delta)` and `dispose()`
4. Instantiate from the active scene (`FallingScene` unless entrypoint changes)
5. Wire `update()` in the render loop
6. Wire `dispose()` in cleanup

### Add Character Textures

1. Add texture under `public/textures/`
2. Add a material map entry in `src/environment/FallingCharacter.ts`:
   - `femaleTextureFiles` for female materials
   - `maleTextureFiles` for male materials
3. Ensure FBX material name and mapping key match in lowercase

### Modify Character Variant Rules

- Update visibility and matching logic in `FallingCharacter.applyVariantConfig()`
- Update allowed generated combinations in `CharacterPool.generateConfigs()`

### Modify Main Menu Icons

- Edit models and animation in `src/ui/MenuIcon3D.ts`
- Edit button labels in `src/ui/MainMenu.ts`
- Keep label-to-icon mapping explicit:
  - `key` type represents the `Claim Early Access` key icon
  - `globe` type represents the `GlobaNet` icon
  - `inbox` type represents the `B-mail` icon
  - `friends` type represents the `Social` icon
  - `info` type is currently unused by `MainMenu` (paper-style icon still exists in `MenuIcon3D`)
- If changing MainMenu icon size, sync `ICON_RENDER_SIZE`, `FRIENDS_ICON_RENDER_SIZE`, and CSS icon dimensions
- If changing in-world orbit icon size, also sync related constants in `CharacterOrbitCarousel` (`ICON_DISPLAY_SIZE_PX`, `BUTTON_WIDTH_PX`, `BUTTON_HEIGHT_PX`, hitbox constants)

### Modify Paper Icon Look

Paper appearance is generated procedurally in `MenuIcon3D.createPaperTexture()`.

- Current approach uses `MeshBasicMaterial` for the paper mesh to avoid scene-light hotspots
- Texture intentionally carries line-art/details; base tone is driven by paper material tint
- If you see uneven lighting artifacts on paper, verify material type has not regressed to a lit material

### Modify Shaders

Shaders live in `src/shaders/` and are imported directly:

```typescript
import vertexShader from '../shaders/example.vert.glsl';
import fragmentShader from '../shaders/example.frag.glsl';
```

## Known Caveats

- `main.ts` does not attach a default `tbo:menu-action` listener. If you need button behavior, pass `onAction` to `MainMenu` or add a global listener.
- The icon type name for Early Access is `key`. Keep label/icon mapping explicit if refactoring.
- `MenuIcon3D` currently contains dormant helper paths that are not wired into active icon construction (`createFriendsSocialPanelTexture` / `renderFriendsSocialPanel`, `createPortalStreakTexture`, `createPortalVortexTexture`).
- Build commonly emits a Vite chunk-size warning (`>500 kB`); treat as informational unless bundling work is in scope.

## Exact Parity Mode (BigCorpp Imports)

Use this mode when asked to match behavior or visuals from `BigCorpp/TheBigOne` "exactly".

- Source from canonical files first and treat them as the single source of truth:
  `UXML`, `USS`, screen/controller scripts, and required shared style dependencies
  (for example `GlobalStyles.uss` and `Inventory.uss`).
- Copy numeric values, spacing, radii, colors, and timing values exactly from source files.
- Do not add creative styling in parity mode:
  no extra gradients, glows, motion, color shifts, or layout changes unless they exist upstream.
- Social panel parity checklist:
  preserve transparent/minimal visual style, use `basic-button` token values from USS, and preserve canonical panel sizing/layout.
- Resolution vs size rule:
  if asked to improve quality, increase texture backing resolution only; keep world-space size unchanged unless size change is explicitly requested.
- Repo hygiene:
  do not commit scratch/context files (for example `context.md`) unless explicitly requested.
- PowerShell command compatibility:
  use separate commands or `;` as a command separator instead of `&&`.

## External References

Character assets originate from Unity project `BigCorpp/TheBigOne`. Use that source for material and mesh naming truth when mappings drift.

