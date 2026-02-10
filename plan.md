# Optimization Plan and Session Handoff

Date: 2026-02-10
Repo: `C:\Users\gazin\tbowebsite`

## Canonical Tracker

- This file is now the single source of truth for optimization status and resume steps.
- `progress.md` is intentionally reduced to a pointer to prevent status drift.

## Current Status

- Phase 0 (measurement + guardrails): Complete.
- Phase 1 (frame-time quick wins): Complete.
- Phase 2 (memory and asset load): Complete.
- Phase 3 (bundle/module strategy): Complete.
- Phase 4 (secondary GPU/render work): Complete.
- Phase 5 (verification/regression safety): In progress.

## What Is Already Done

- Performance instrumentation and baseline capture setup:
  - `src/utils/DevPerformanceMonitor.ts`
  - `docs/perf-baseline.md`
- Scene hot-loop optimizations and allocation reduction:
  - `src/scene/FallingScene.ts`
- Texture ownership/memory strategy for character assets:
  - `src/environment/FallingCharacter.ts`
  - `src/environment/CharacterPool.ts`
- Weather lightning pooling + opacity/state-change cleanup:
  - `src/environment/WeatherParticles.ts`
- Header icon loop throttling/visibility gating:
  - `src/ui/HeaderOverlay.ts`
- `MenuIcon3D` split into focused modules with lazy-loaded info icon:
  - `src/ui/MenuIcon3D.ts`
  - `src/ui/menu-icon/buildKeyIcon.ts`
  - `src/ui/menu-icon/buildGlobeIcon.ts`
  - `src/ui/menu-icon/buildInboxIcon.ts`
  - `src/ui/menu-icon/buildFriendsIcon.ts`
  - `src/ui/menu-icon/buildInfoIcon.ts`
  - `src/ui/menu-icon/friendsConstants.ts`
  - `src/ui/menu-icon/friendsConversationScript.ts`
- Chunking strategy applied:
  - `vite.config.ts` (`manualChunks` for `three` and `menu-icon`)

## Verified So Far

- Latest local build result: pass (`npm.cmd run build`).
- Latest chunk snapshot:
  - `dist/assets/three-BHFk_gJM.js` = `618.70 kB` minified (`161.27 kB` gzip)
  - `dist/assets/menu-icon-CcP0RGiD.js` = `62.22 kB` minified (`17.61 kB` gzip)
  - `dist/assets/buildInfoIcon-BAy1HD1P.js` = `1.71 kB` minified (`0.99 kB` gzip)
  - `dist/assets/index-DiHX7bbm.js` = `81.40 kB` minified (`22.88 kB` gzip)
- Contract checks revalidated in code:
  - `tbo:menu-action` payload stays `{ action, label }`
  - `tbo:local-weather-update` integration into `FallingScene`
  - `ORBIT_LAYER = 2` contract intact in carousel path
- Draft Phase 5 report exists:
  - `docs/perf-final.md`

## Resume Point (Start Here In A New Session)

Phase 5 is the only remaining work.

1. Start dev server for manual runtime validation:
   - `npm.cmd run dev`
2. Open with perf overlay enabled:
   - `http://localhost:5173/?tboPerf=1`
3. Manually validate console/runtime behavior:
   - No WebGL runtime errors
   - No Three.js disposal warnings
   - No increase in `No texture for material:` warnings
4. Capture and record perf metrics in `docs/perf-final.md`:
   - avg frame time
   - p95 frame time
   - worst frame time
   - renderer counters from `renderer.info`
5. Finalize docs/state:
   - Mark Phase 5 as complete in this file.
   - Update `docs/perf-final.md` with final runtime findings and any tradeoffs.

## Guardrails (Do Not Drift)

- Preserve contracts from `AGENTS.md`:
  - `tbo:menu-action` payload shape is `{ action, label }`
  - `tbo:local-weather-update` must continue feeding `FallingScene`
  - `ORBIT_LAYER = 2` must remain enabled for camera, carousel meshes, and raycaster
- Keep dormant/legacy `MenuIcon3D` helper paths out of scope unless explicitly requested.

## Verification Commands

- Required:
  - `npm.cmd run build`
- Optional interactive:
  - `npm.cmd run dev`

