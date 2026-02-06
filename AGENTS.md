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
- `src/ui/Terminal.ts` exists but is not currently mounted
- `src/scene/SceneManager.ts` and `src/scene/WireframeScene.ts` exist but are not currently used by `main.ts`
- The active UI class is `MainMenu` (not `DreamcastMenu`)
- Main menu currently renders three buttons: `Early Access`, `GlobaNet`, `About Us`

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

`MainMenu` uses a shared offscreen `THREE.WebGLRenderer` and each button icon is drawn into its own display canvas via `MenuIcon3D`.

- Offscreen render size constant: `src/ui/MainMenu.ts` `ICON_RENDER_SIZE`
- Per-icon canvas blit size constant: `src/ui/MenuIcon3D.ts` `ICON_SIZE`
- CSS display size: `.dc-menu-btn-icon` and `.dc-menu-btn-icon canvas` in `src/style.css`

When resizing icons, update all three locations together to avoid blur, clipping, or inconsistent scale.

### Asset Loading

- Models: `public/models/` (FBX)
- Textures: `public/textures/` (JPG/PNG)
- Use Three.js loaders (`FBXLoader`, `TextureLoader`)

## Active Scene Notes

### FallingScene

- Spawns and recycles many emissive cubes moving toward the camera
- Uses ACES tone mapping, fog, and fragment-like cube particles near the camera
- Delegates character logic to `CharacterPool`

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

## File Organization

```text
src/
  main.ts
  style.css
  scene/
    FallingScene.ts          # Active scene
    SceneManager.ts          # Present but not mounted
    WireframeScene.ts        # Present but not mounted
  environment/
    CharacterPool.ts         # Active character orchestration
    FallingCharacter.ts      # Active character variant/material logic
    *.ts                     # Other components, some unused by current entrypoint
  ui/
    MainMenu.ts              # Active UI overlay
    MenuIcon3D.ts            # 3D icon renderer + icon models/animation
    Terminal.ts              # Present but not mounted
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
  - `rocket` type currently represents the `Early Access` key icon
  - `globe` type currently represents the `GlobaNet` icon
  - `info` type currently represents the paper-style `About Us` icon
- If changing icon size, sync `ICON_RENDER_SIZE`, `ICON_SIZE`, and CSS icon dimensions

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

- `FallingScene` currently binds resize handlers inline for both add and remove. If touching lifecycle code, prefer a stored handler reference so removal works correctly.
- The icon type name `rocket` is legacy and no longer visually a rocket. Rename carefully if refactoring to avoid breaking label/icon mapping.
- Build commonly emits a Vite chunk-size warning (`>500 kB`); treat as informational unless bundling work is in scope.

## External References

Character assets originate from Unity project `BigCorpp/TheBigOne`. Use that source for material and mesh naming truth when mappings drift.
