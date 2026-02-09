# Agent Bootstrap for The Big One Website

Purpose: keep new-session startup cheap. This file is bootstrap-only and should stay concise.

Last verified: 2026-02-09
Line budget: keep this file under 160 lines.

## Session Start Protocol

Read these files first and only expand scope when needed:

1. `src/main.ts`
2. `src/scene/FallingScene.ts`
3. `src/environment/CharacterOrbitCarousel.ts`
4. `src/environment/CharacterPool.ts`
5. `src/environment/FallingCharacter.ts`
6. `src/ui/HeaderOverlay.ts`

Read `src/ui/MenuIcon3D.ts` only when icon visuals or icon animation are directly in scope.

## Current Runtime Truth

- Entry point boots `FallingScene`, `HeaderOverlay`, and `LocalWeatherService`.
- Active scene is `FallingScene` (falling cubes + rotating character variants).
- In-world menu is `CharacterOrbitCarousel` (not DOM menu buttons).
- Header shows date/time/weather and `Claim Early Access`.

## Critical Contracts (Do Not Drift)

- Event `tbo:menu-action` payload: `{ action, label }`.
- Event `tbo:local-weather-update` feeds weather state into `FallingScene`.
- Environment component pattern:
  - Constructor accepts `THREE.Scene`.
  - Implements `update(delta: number)`.
  - Implements `dispose()`.
  - Owns and disposes geometry/material/texture resources.

## Orbit Carousel Fast Facts

- File: `src/environment/CharacterOrbitCarousel.ts`.
- Uses `MenuIcon3D.mountToObject()` to render icons directly in the main scene.
- Layer contract: `ORBIT_LAYER = 2` must be enabled on camera, carousel meshes, and raycaster.
- Actions/labels currently shipped:
  - `play` -> `GlobaNet` (`globe`)
  - `inbox` -> `B-mail` (`inbox`)
  - `friends` -> `B-social` (`friends`)
- Hit detection uses invisible hit meshes + `THREE.Raycaster`.
- Selection is sticky (`activeIndex`) until another click or dispose.
- In-world icon/button size constants live in `CharacterOrbitCarousel`:
  - `ICON_DISPLAY_SIZE_PX`
  - `BUTTON_WIDTH_PX`
  - `BUTTON_HEIGHT_PX`
  - related gap/radius/hitbox constants

## Task Routing (Open Only What You Need)

- Carousel behavior, hover/click, sizing:
  - `src/environment/CharacterOrbitCarousel.ts`
  - `src/ui/MenuIcon3D.ts` (only relevant icon sections)
- Character orbit anchor and transitions:
  - `src/environment/CharacterPool.ts`
  - `src/environment/FallingCharacter.ts`
- Header actions, key icon, weather readout:
  - `src/ui/HeaderOverlay.ts`
- Scene wiring, render loop, lifecycle:
  - `src/scene/FallingScene.ts`
  - `src/main.ts`
- Weather sourcing:
  - `src/utils/LocalWeatherService.ts`
  - `src/utils/LocalWeather.ts`

## Ignore By Default

Do not scan these unless the task explicitly requires them:

- Legacy or inactive environment experiments in `src/environment/` (wireframe/alt sky/alt clouds files).
- Dormant icon helper paths in `MenuIcon3D`:
  - `createFriendsSocialPanelTexture`
  - `renderFriendsSocialPanel`
  - `createPortalStreakTexture`
  - `createPortalVortexTexture`
- Legacy DOM icon sizing classes (`.dc-menu-btn-icon*`) when working on in-world carousel behavior.

## Known Caveats

- `main.ts` does not register a default global `tbo:menu-action` listener.
- Both header and carousel dispatch `tbo:menu-action` with `{ action, label }`.
- Build commonly warns about chunk size (`>500 kB`); informational unless bundling is in scope.

## Verification

Run:

```bash
npm run build
```

Optional interactive check:

```bash
npm run dev
```

Console checks:

- `No texture for material:` warnings
- Three.js disposal warnings
- WebGL errors

## Exact Parity Mode (BigCorpp Imports)

When asked to match `BigCorpp/TheBigOne` exactly:

- Treat upstream `UXML`/`USS`/controller scripts as source of truth.
- Copy numeric values exactly (spacing, radii, timing, color).
- Do not add visual embellishments unless present upstream.
- If improving quality, increase backing resolution only unless size change is requested.
- Do not commit scratch context files unless requested.
- In PowerShell, use `;` or separate commands, not `&&`.

## Deep Reference (Read On Demand)

- `docs/agent/reference.md` (full long-form project reference)
- `docs/agent/carousel.md` (carousel-focused implementation notes)
- If details conflict, treat this bootstrap file and current source code as authoritative.
