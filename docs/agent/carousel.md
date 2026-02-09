# Character Orbit Carousel Notes

Use this file when the task involves in-world menu behavior, icon sizing, click handling, or orbit positioning.

## Runtime Wiring

- Scene bootstraps carousel in `src/scene/FallingScene.ts`.
- Constructor path:
  - `new CharacterOrbitCarousel(scene, camera, canvas, characterPool)`
- Per-frame update path:
  - `characterPool.update(delta)`
  - `orbitCarousel.update(delta, renderer)`

## Ownership and Dependencies

- Main class: `src/environment/CharacterOrbitCarousel.ts`
- Upstream anchor source: `CharacterPool.getActiveCharacterOrbitAnchor()`
- Icon renderer/model source: `src/ui/MenuIcon3D.ts`
- Event output: `tbo:menu-action` with `{ action, label }`

## Current Actions and Labels

- `play` -> `GlobaNet` (`globe`)
- `inbox` -> `B-mail` (`inbox`)
- `friends` -> `B-social` (`friends`)

## Layer Contract (Critical)

`ORBIT_LAYER = 2` must be consistent across:

- Camera: `camera.layers.enable(ORBIT_LAYER)`
- Visible carousel meshes
- Invisible hit meshes
- Raycaster query layer

If any part drifts, icons may render but stop receiving hover/click, or vice versa.

## Update Loop Behavior

Per item, each frame:

1. Update icon animation (`MenuIcon3D.update(delta, renderer)`).
2. Set orbit position (ellipse on X/Z).
3. Billboard toward camera while staying upright (no pitch/roll drift).
4. Apply depth-aware scale.
5. Adjust render order.
6. Redraw button texture only when hover/active state changes.

## Interaction Model

- Pointer events are registered on the scene canvas (`pointermove`, `pointerleave`, `click`).
- Picking uses an invisible plane (`hitMesh`) per item.
- Hover is transient (`hoveredIndex`).
- Active state is sticky (`activeIndex`) and changes only on click.

## Sizing Model

- In-world size is world-space, not CSS.
- Icon bounds are measured after mount, then scaled to target world size.
- Key constants in `CharacterOrbitCarousel`:
  - `ICON_DISPLAY_SIZE_PX`
  - `BUTTON_WIDTH_PX`
  - `BUTTON_HEIGHT_PX`
  - gap/radius/font/hitbox constants

When changing visual size, update hitbox and spacing constants together.

## MenuIcon3D Path

Carousel uses mounted-scene path:

- `new MenuIcon3D(tinyCanvas, iconType)`
- `icon.mountToObject(iconHost, ORBIT_LAYER)`
- Rendered directly in main scene (no per-frame canvas blit for carousel path)

Header uses offscreen path and is separate.

## Anchor Behavior

- Carousel hides while no active character anchor is available.
- Anchor comes from `FallingCharacter.getOrbitAnchor()` via prioritized hip/spine bone lookup.
- If bones are unavailable, pool falls back to model position + bounds-derived Y.

## Performance Notes

- `MenuIcon3D` is large; `friends` path has frequent texture updates.
- Avoid broad edits in `MenuIcon3D` for carousel-only issues.
- Prefer fixing layout/picking in `CharacterOrbitCarousel` first.

## Common Failure Checklist

- No carousel visible:
  - character anchor returning `null`
  - layer mismatch
  - root visibility never set true
- Hover/click broken:
  - raycaster layer mismatch
  - hit meshes not on orbit layer
  - canvas pointer listeners not attached
- Size/offset wrong:
  - icon target size changed without hitbox/gap updates
  - bounds measurement affected by added geometry not flagged for ignore

## Bounds Ignore Hook

`measureIconBounds()` skips branches with:

- `object.userData.carouselBoundsIgnore === true`

Use this for decorative geometry that should not expand hitbox/layout bounds.
