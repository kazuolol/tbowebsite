# Agent Guidelines for The Big One Website

This document provides architectural context and principles for AI agents working on this codebase.

## Project Overview

A 3D landing page for "The Big One" MMORPG early access signup. The site features a falling character scene with wireframe environment elements and a Dreamcast BIOS-inspired UI overlay.

## Tech Stack

- **Vite** - Build tool and dev server
- **TypeScript** - Strict typing enabled
- **Three.js** - 3D rendering
- **GLSL** - Custom shaders via `vite-plugin-glsl`

## Architecture Principles

### Scene/Environment Pattern

The codebase follows a clear separation:

```
Scene (orchestrator) → Environment components (individual 3D elements)
```

- **Scenes** (`src/scene/`) - Manage camera, lighting, animation loop, and coordinate environment components
- **Environment** (`src/environment/`) - Self-contained 3D objects with their own update logic

Each environment component should:
1. Accept a `THREE.Scene` in constructor
2. Have an `update(delta: number)` method for animation
3. Have a `dispose()` method for cleanup
4. Manage its own materials and geometries

### UI Layer

HTML/CSS overlays in `src/ui/` are separate from the 3D scene. The UI root element sits above the WebGL canvas.

### Asset Loading

- Models: `/public/models/` - FBX format
- Textures: `/public/textures/` - JPG/PNG
- Use Three.js loaders (`FBXLoader`, `TextureLoader`)

## Key Gotchas

### FBX Texture Mapping

When loading FBX models with custom textures:

1. **flipY must be `true`** for textures to map correctly to FBX UV coordinates
2. **Preserve UV transforms** from original materials when replacing them
3. **Material names are lowercase** - always use `.toLowerCase()` when matching

```typescript
texture.flipY = true;  // Required for FBX models
texture.colorSpace = THREE.SRGBColorSpace;
```

### Material Replacement

When replacing FBX materials, preserve the original's UV transform:

```typescript
if (origMat.map) {
  newTexture.offset.copy(origMat.map.offset);
  newTexture.repeat.copy(origMat.map.repeat);
  newTexture.rotation = origMat.map.rotation;
  newTexture.center.copy(origMat.map.center);
}
```

### Character Variants

The `FallingCharacter` class handles multiple hair/outfit variants:
- Hair: `001` through `005`
- Outfits: `001` through `006`
- Body meshes have corresponding cuts per outfit
- Meshes are hidden/shown based on random selection

### Memory Management

Always implement `dispose()` methods that:
- Remove objects from scene
- Dispose geometries
- Dispose materials and their textures
- Clear references

## File Organization

```
src/
├── main.ts              # Entry point
├── style.css            # Global styles
├── scene/               # Scene orchestrators
│   ├── FallingScene.ts  # Current active scene
│   └── *.ts             # Alternative/unused scenes
├── environment/         # 3D components
│   ├── FallingCharacter.ts  # Animated character with variants
│   └── *.ts             # World elements (wireframe buildings, grass, etc.)
├── ui/                  # HTML overlay components
│   ├── DreamcastMenu.ts # Main UI
│   └── *.ts             # Other UI components
├── shaders/             # GLSL shaders
│   └── *.glsl
└── utils/               # Shared utilities
```

## Testing Changes

```bash
npm run dev      # Start dev server with HMR
npm run build    # TypeScript check + production build
```

Always check browser console for:
- "No texture for material:" warnings (texture mapping issues)
- Three.js warnings about disposed objects
- WebGL errors

## Common Tasks

### Adding a New Environment Component

1. Create class in `src/environment/`
2. Accept `THREE.Scene` in constructor
3. Implement `update(delta)` and `dispose()`
4. Instantiate in the relevant Scene class
5. Call `update()` in animation loop
6. Call `dispose()` on cleanup

### Adding New Character Textures

1. Add texture file to `/public/textures/`
2. Add mapping entry in `FallingCharacter.ts` `textureFiles` array:
   ```typescript
   { matName: 'm_youghfemale_xxx', path: '/textures/filename.png' }
   ```
3. Material names must match FBX material names (lowercase)

### Modifying Shaders

Shaders are in `src/shaders/` as `.glsl` files. Import directly:
```typescript
import vertexShader from '../shaders/example.vert.glsl';
import fragmentShader from '../shaders/example.frag.glsl';
```

## External References

Character assets originate from a Unity project at `BigCorpp/TheBigOne`. Material configurations there can be referenced for correct texture assignments.
