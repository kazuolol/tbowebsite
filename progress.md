# Progress Report

Last updated: 2026-02-10
Repo: `C:\Users\gazin\tbowebsite`

## Phase Status

- Phase 0 (Measurement and guardrails): Complete
- Phase 1 (Frame-time quick wins): Complete
- Phase 2 (Memory and asset load optimization): Complete
- Phase 3 (Bundle and module strategy): In progress
- Phase 4 (Secondary GPU/render improvements): In progress
- Phase 5 (Verification and regression safety): Pending

## Completed Work

- Added dev-only performance monitor and baseline doc:
- `src/utils/DevPerformanceMonitor.ts`
- `docs/perf-baseline.md`
- Implemented scene hot-loop optimizations:
- `src/scene/FallingScene.ts`
- Optimized friends icon texture upload cadence/invalidation:
- `src/ui/MenuIcon3D.ts`
- Reworked character texture ownership and sharing:
- `src/environment/FallingCharacter.ts`
- `src/environment/CharacterPool.ts`
- Applied initial chunk strategy:
- `vite.config.ts` (`manualChunks` for `three` and `menu-icon`)

## Current In-Flight Changes

- `src/environment/WeatherParticles.ts`
- Lightning now uses pooled reusable bolt resources instead of per-bolt create/dispose.
- `src/ui/HeaderOverlay.ts`
- Icon loop is visibility-aware and update-rate limited to reduce offscreen/render overhead.
- `plan.md`
- Updated implementation status and phase notes.

## Latest Build Check

- Command: `npm.cmd run build`
- Status: Pass
- Latest chunk snapshot:
- `dist/assets/three-VwuSmR44.js` = `618.70 kB` minified (`161.27 kB` gzip)
- `dist/assets/menu-icon-Dvd44qaZ.js` = `66.15 kB` minified (`17.63 kB` gzip)
- `dist/assets/index-MgfJ-8GO.js` = `81.38 kB` minified (`22.87 kB` gzip)

## Next Steps

1. Finish Phase 3 module split of `MenuIcon3D` into focused icon modules and preserve API parity.
2. Complete remaining Phase 4 validation (material/state-change checks and behavior parity).
3. Execute Phase 5 runtime verification and produce `docs/perf-final.md` with measured deltas.
