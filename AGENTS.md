```md
# Agent Bootstrap for The Big One Website

Purpose: keep new-session startup cheap. This file is bootstrap-only and must stay concise.

Last verified: 2026-02-12
Line budget: keep this file under 160 lines.

---

## Session Start Protocol (Open Only What You Need)

Read these first. Expand scope only when necessary:

- src/main.ts
- src/scene/FallingScene.ts
- src/environment/CharacterOrbitCarousel.ts
- src/environment/CharacterPool.ts
- src/environment/FallingCharacter.ts
- src/ui/HeaderOverlay.ts
- src/ui/EarlyAccessOverlay.ts (only when early-access claim/social/key/guild flow is in scope)

Read src/ui/MenuIcon3D.ts only when icon visuals or icon animation are directly in scope.

---

## Core Engineering Principles (Non-Negotiable)

### DRY + Single Source of Truth (SSOT)
- Define each “truth” once: constants, event payload shapes, labels, action IDs, sizes, timings.
- If a value is used in 2+ places, it must live in ONE exported place (module constant or contract).
- Never duplicate magic numbers across files. If you must introduce one, immediately name it and centralize it.

### Modularity + Local Reasoning
- Keep modules small: “one responsibility, one owner.”
- Prefer pure functions for transformations (input → output, no hidden state).
- Keep side effects at the edges (wiring, event listeners, IO, scene mutation).
- Public surfaces should be minimal: export only what other modules must depend on.

### Simple + Elegant (Low Cognitive Load)
- Favor straightforward control flow over cleverness.
- Prefer explicit names over comments. Comments explain “why,” not “what.”
- Avoid “action at a distance” (hidden globals, cross-file mutation, implicit coupling).

### Contracts First
- Events, payloads, and externally-observed behavior are contracts. Do not drift.
- If you need to change a contract, add a compat layer and migrate intentionally.

---

## Current Runtime Truth

- Entry point boots: FallingScene, HeaderOverlay, EarlyAccessOverlay, LocalWeatherService.
- Active scene: FallingScene (falling cubes + rotating character variants).
- In-world menu: CharacterOrbitCarousel (not DOM menu buttons).
- Header shows date/time/weather + Claim Early Access.
- /claim path and ?guild=CODE deep links open the early-access overlay.

---

## Critical Contracts (Do Not Drift)

Events:
- tbo:menu-action payload: { action, label }
- tbo:local-weather-update feeds weather state into FallingScene
- tbo:early-access-claimed payload: { walletPublicKey, status, acceptanceId?, guildCode? }
- Legacy founderKey?.serial handling is preserved during local state restore/migration only.

Environment component pattern:
- Constructor accepts THREE.Scene
- Implements update(delta: number)
- Implements dispose()
- Owns and disposes geometry/material/texture resources it creates

---

## Orbit Carousel Fast Facts

- File: src/environment/CharacterOrbitCarousel.ts
- Uses MenuIcon3D.mountToObject() to render icons directly in the main scene
- Layer contract: ORBIT_LAYER = 2 must be enabled on camera, carousel meshes, and raycaster

Actions/labels shipped:
- play -> GlobaNet (globe)
- inbox -> B-mail (inbox)
- friends -> B-social (friends)

Hit detection:
- Invisible hit meshes + THREE.Raycaster
- Selection is hover-focused; no sticky activeIndex click selection is currently used

SSOT rule for sizing:
- ICON_DISPLAY_SIZE_PX / BUTTON_WIDTH_PX / BUTTON_HEIGHT_PX and related gap/radius/hitbox constants
  should remain centralized (do not copy into other files; import/re-export if needed).

---

## Task Routing (Open Only What You Need)

Carousel behavior, hover/click, sizing:
- src/environment/CharacterOrbitCarousel.ts
- src/ui/MenuIcon3D.ts (only relevant icon sections)

Character orbit anchor and transitions:
- src/environment/CharacterPool.ts
- src/environment/FallingCharacter.ts

Header actions, key icon, weather readout:
- src/ui/HeaderOverlay.ts

Early access claim/social/key/guild flow:
- src/ui/EarlyAccessOverlay.ts
- src/ui/earlyAccessApi.ts
- src/ui/HttpEarlyAccessApi.ts
- src/ui/earlyAccessApiContract.ts
- src/types/EarlyAccess.ts
- src/style.css (.dc-early-*, .dc-overlay-card, .dc-header-extension-*)

Scene wiring, render loop, lifecycle:
- src/scene/FallingScene.ts
- src/main.ts

Weather sourcing:
- src/utils/LocalWeatherService.ts
- src/utils/LocalWeather.ts

---

## Ignore By Default

Do not scan unless explicitly required:
- Legacy/inactive environment experiments in src/environment/ (wireframe/alt sky/alt clouds files)
- Dormant icon helper paths in MenuIcon3D:
  - createFriendsSocialPanelTexture
  - renderFriendsSocialPanel
  - createPortalStreakTexture
  - createPortalVortexTexture
- Legacy DOM icon sizing classes (.dc-menu-btn-icon*) when working on in-world carousel behavior

---

## Change Hygiene Checklist (Before You Commit)

DRY / SSOT:
- Did you introduce a new constant used in >1 place? Centralize it.
- Did you copy an existing constant or payload shape? Import it instead.

Modularity:
- Did you add cross-module coupling? Prefer dependency injection via constructor args or explicit params.
- Did you add state? Ensure it has one owner and a clear lifecycle.

Simplicity:
- Can a new reader explain the change in <30 seconds by reading one file?
- No hidden listeners, no “magic” global reads, no silent fallthrough.

Three.js correctness:
- Any created geometry/material/texture is disposed in dispose()
- No per-frame allocations in update() unless unavoidable

Contracts:
- Event names/payload shapes unchanged, or compat path added intentionally

---

## Known Caveats

- main.ts registers a global tbo:menu-action listener and opens the overlay when action === 'early-access'
- Header dispatches tbo:menu-action with { action, label }; carousel currently does not dispatch actions
- main.ts clears early-access localStorage keys only in dev mode (import.meta.env.DEV) using keys:
  - tbo:early-access-overlay:state:v2
  - tbo:early-access-api:mock-state:v1
  - tbo:early-access-api:client-id:v1
  - tbo:early-access:dev-wallet
- Build commonly warns about chunk size (>500 kB); informational unless bundling is in scope

---

## Verification

Run:
- npm run build

Optional interactive:
- npm run dev

Console checks:
- No texture for material warnings
- Three.js disposal warnings
- WebGL errors

---

## Exact Parity Mode (BigCorpp Imports)

When asked to match BigCorpp/TheBigOne exactly:
- Treat upstream UXML/USS/controller scripts as source of truth
- Copy numeric values exactly (spacing, radii, timing, color)
- Do not add visual embellishments unless present upstream
- If improving quality, increase backing resolution only unless size change is requested
- Do not commit scratch context files unless requested
- In PowerShell, use ; or separate commands, not &&

---

## Deep Reference (Read On Demand)

- docs/agent/reference.md (full long-form project reference)
- docs/agent/carousel.md (carousel-focused implementation notes)

If details conflict, treat this bootstrap file and current source code as authoritative.
```

If you want, I can also add a tiny “SSOT map” (1–2 lines each) that tells agents *where* to put shared constants (events/labels/sizes/contracts) without expanding this file much.
