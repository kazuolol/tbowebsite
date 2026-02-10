# Optimization Plan and Session Handoff

Date: 2026-02-10
Repo: `D:\code\tbowebsite`

## Canonical Tracker

- This file is now the single source of truth for optimization status and resume steps.
- `progress.md` is intentionally reduced to a pointer to prevent status drift.

## Current Status

- Phase 0 (measurement + guardrails): Complete.
- Phase 1 (frame-time quick wins): Complete.
- Phase 2 (memory and asset load): Complete.
- Phase 3 (bundle/module strategy): Complete.
- Phase 4 (secondary GPU/render work): Complete.
- Phase 5 (verification/regression safety): Complete.

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
  - `dist/assets/index-CI-WPgD-.js` = `82.03 kB` minified (`23.18 kB` gzip)
- Contract checks revalidated in code:
  - `tbo:menu-action` payload stays `{ action, label }`
  - `tbo:local-weather-update` integration into `FallingScene`
  - `ORBIT_LAYER = 2` contract intact in carousel path
- Runtime perf capture completed (`?tboPerf=1`, headless CDP):
  - frame avg/p95/worst = `80.23 / 113.10 / 2043.80 ms`
  - renderer calls/triangles/lines/points = `450 / 39109 / 4680 / 0`
  - renderer textures/geometries/programs = `39 / 197 / 28`
  - `No texture for material:` warnings not observed in capture
  - Three.js disposal warnings not observed in capture
- Material warning cleanup completed:
  - `src/environment/FallingCharacter.ts` no longer passes `color: undefined` into `MeshStandardMaterial`
  - interactive runtime check reports `THREE.Material ... color undefined` warning count = `0`
- Interactive desktop-GPU spot check completed (`RTX 3090`, non-headless CDP):
  - frame avg/p95/worst = `9.41 / 21.40 / 865.10 ms`
  - renderer calls/triangles/lines/points = `453 / 36424 / 4680 / 0`
  - renderer textures/geometries/programs = `41 / 211 / 28`
  - no `No texture for material:`, disposal, or WebGL runtime error warnings observed
- FBX/noise + network 404 cleanup completed:
  - added `src/environment/fbxWarningFilter.ts` and wired it into all FBX load paths
  - added favicon link in `index.html` to stop missing `/favicon.ico` requests
  - final interactive verification: total runtime warning count = `0`
  - final interactive frame avg/p95/worst = `7.90 / 20.70 / 582.50 ms`
- Long-soak validation completed:
  - 10-minute soak run (`?tboPerf=1`, RTX 3090) completed with `0` app/runtime warnings
  - 10-minute run showed one terminal outlier (`worst = 30023.8 ms`) while p95 remained stable (`18.8` to `20.8 ms`), consistent with browser throttling/occlusion behavior
  - 5-minute control soak (background throttling disabled) confirmed stable drift:
  - avg range = `5.89` to `7.38 ms`
  - p95 range = `17.0` to `22.3 ms`
  - worst range = `22.9` to `81.8 ms`
  - warning counts remained `0` across color/texture/FBX/disposal/WebGL/404 categories
- Capture workflow update:
  - soak captures now navigate a single Chrome tab via CDP (no duplicate app tabs required)
- Phase 5 report finalized:
  - `docs/perf-final.md`

## Remaining Optional Follow-Up

1. None currently. Optional long-soak validation is complete and recorded in `docs/perf-final.md`.

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

