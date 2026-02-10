# Optimization Plan

Date: 2026-02-10
Repo: `C:\Users\gazin\tbowebsite`

## Implementation Status (Updated 2026-02-10)

- Phase 0: Complete.
- Phase 1: Complete.
- Phase 2: Complete.
- Phase 3: In progress.
- Phase 4: Pending.
- Phase 5: Pending.

### Completed This Cycle

- Added dev-only perf monitor + toggle:
- `src/utils/DevPerformanceMonitor.ts`
- `src/scene/FallingScene.ts`
- `docs/perf-baseline.md`
- Implemented frame-time quick wins:
- Removed per-frame allocation hotspots in fragment paths.
- Added shared box geometry buckets for cubes/fragments.
- Made resize checks event-driven with periodic guard fallback.
- Avoided projection updates when FOV change is negligible.
- Optimized friends icon updates in `src/ui/MenuIcon3D.ts`:
- Added visual-state invalidation and animation-aware upload throttling.
- Reworked texture ownership and sharing:
- `src/environment/FallingCharacter.ts` now uses shared texture variants with ref-counted release.
- `src/environment/CharacterPool.ts` now owns pooled base textures for pool lifetime.
- Added constrained-device texture tier policy (downscale + max size caps).
- Added initial bundle chunk strategy:
- `vite.config.ts` manual chunking for `three` and `menu-icon`.
- Added build-time dev constant:
- `src/vite-env.d.ts`
- `vite.config.ts`

### Latest Build Snapshot

- Build command: `npm.cmd run build`
- Build status: pass
- Chunk outputs:
- `dist/assets/three-VwuSmR44.js` = `618.70 kB` minified, `161.27 kB` gzip.
- `dist/assets/menu-icon-Dvd44qaZ.js` = `66.15 kB` minified, `17.63 kB` gzip.
- `dist/assets/index-DRb2ixh3.js` = `79.58 kB` minified, `22.40 kB` gzip.

## Goals

- Improve frame stability and average frame time.
- Reduce startup load cost (network, parse, GPU upload, initialization).
- Reduce runtime memory pressure (JS heap + GPU textures/materials/geometries).
- Reduce bundle size and improve code-splitting.
- Preserve current visual behavior and runtime contracts from `AGENTS.md`.

## Current Baseline

- Build command: `npm.cmd run build`
- Build status: pass
- Main JS chunk: `dist/assets/index-D1ADIi8o.js` = `757.44 kB` minified, `198.66 kB` gzip.
- Character assets actively loaded at startup:
- Models used by `CharacterPool.preload(...)`: about `15.194 MB` on disk.
- Textures referenced by `FallingCharacter` texture maps: about `20.291 MB` on disk.
- Approx decoded texture VRAM footprint (single copy each map): about `640 MB`.

## Key Hotspots (Observed)

- `src/ui/MenuIcon3D.ts`
- Friends icon path redraws and re-uploads canvas textures each frame.
- Very large module with both active and dormant helper paths.
- `src/scene/FallingScene.ts`
- Hot loop has avoidable allocations (`clone()` paths) and geometry churn.
- Camera/projection/resize work runs every frame.
- `src/environment/FallingCharacter.ts`
- Per-material texture cloning inflates memory.
- `src/environment/CharacterPool.ts`
- Eager preload of large model + texture sets at startup.
- `src/environment/WeatherParticles.ts`
- Lightning allocates short-lived geometry/material instances.

## Execution Plan

### Phase 0: Measurement and Guardrails

- Add lightweight perf instrumentation toggles (dev only):
- Frame timing (avg, p95, worst).
- Draw calls / triangles / texture count from `renderer.info`.
- Heap sampling points during startup and steady state.
- Capture baseline on desktop and mobile viewport.
- Define target budgets:
- Stable 60 FPS desktop, no major spikes during steady state.
- Improve p95 frame time by at least 20%.
- Reduce startup time to first stable render by at least 20%.

Deliverables:
- `docs/perf-baseline.md` (metrics table and capture conditions).

Status: Complete.

### Phase 1: Frame-time Quick Wins

- Optimize `FallingScene` hot loop:
- Remove per-frame vector clones in fragment updates.
- Reuse temp vectors for spawn/update operations.
- Avoid unnecessary `camera.updateProjectionMatrix()` unless FOV changes.
- Keep resize checks event-driven first, fallback periodic guard if needed.
- Reduce geometry churn:
- Replace frequent `new BoxGeometry(...)` on recycle with pooled/reused geometries by size buckets.
- Optimize icon updates:
- In `MenuIcon3D` friends path, redraw canvases only when visible content changes.
- Keep animation cadence but avoid full texture upload every frame when state is unchanged.

Deliverables:
- Updated `src/scene/FallingScene.ts`.
- Updated `src/ui/MenuIcon3D.ts` (friends update throttling/on-change invalidation).
- Perf delta report vs Phase 0 baseline.

Status: Complete (perf delta report capture pending runtime measurement pass).

### Phase 2: Memory and Asset Load Optimization

- Rework texture ownership in `FallingCharacter`:
- Avoid cloning map textures per material when not required.
- Share immutable textures where UV transform compatibility allows.
- Preserve contract for independent disposal safety.
- Improve load strategy in `CharacterPool`:
- Keep preload behavior functionally equivalent, but defer non-critical work if possible.
- Add optional lower-tier texture resolution policy for constrained devices.
- Audit and confirm disposal correctness under scene teardown + HMR.

Deliverables:
- Updated `src/environment/FallingCharacter.ts`.
- Updated `src/environment/CharacterPool.ts`.
- Memory report: startup heap + GPU texture count before/after.

Status: Complete (memory report capture pending runtime measurement pass).

### Phase 3: Bundle and Module Strategy

- Split large icon logic:
- Break `MenuIcon3D` into type-specific modules (`key`, `globe`, `inbox`, `friends`, `info`).
- Lazy-load heavy icon builders where safe.
- Keep public API and behavior stable for `HeaderOverlay` and `CharacterOrbitCarousel`.
- Configure Vite chunking (`manualChunks`) to isolate heavy paths.
- Rebuild and validate source maps/chunk outputs.

Deliverables:
- Refactored `src/ui/MenuIcon3D*` modules.
- Updated `vite.config.ts` chunk strategy.
- Bundle report with before/after numbers.

Status: In progress (`manualChunks` applied; module split/lazy-load still pending).

### Phase 4: Secondary GPU/Render Improvements

- Weather particles:
- Reuse lightning resources via small pool instead of create/dispose per bolt.
- Validate material flags to minimize state changes.
- Header/UI loop:
- Ensure no redundant work between scene RAF and header RAF.
- Keep UX identical while reducing offscreen render overhead.

Deliverables:
- Updated `src/environment/WeatherParticles.ts`.
- Updated `src/ui/HeaderOverlay.ts` if needed.

Status: Pending.

### Phase 5: Verification and Regression Safety

- Functional checks:
- `tbo:menu-action` payload parity (`{ action, label }`).
- `tbo:local-weather-update` integration into `FallingScene`.
- Carousel layer contract (`ORBIT_LAYER = 2`) intact.
- Technical checks:
- `npm.cmd run build` passes.
- No new WebGL errors/disposal warnings.
- No increase in texture warnings (`No texture for material:`).

Deliverables:
- `docs/perf-final.md` with final metrics and tradeoff notes.

Status: Pending.

## Prioritized Implementation Order

1. Phase 0 instrumentation.
2. Phase 1 quick wins in `FallingScene` and friends icon updates.
3. Phase 2 texture/memory ownership.
4. Phase 3 bundle split and chunking.
5. Phase 4 secondary optimizations.
6. Phase 5 final verification.

## Risks and Constraints

- Visual parity risk in icon refactors (`MenuIcon3D`) if geometry/material setup drifts.
- Disposal regressions can cause GPU leaks or broken HMR if ownership boundaries are unclear.
- Texture sharing changes must preserve UV transforms and clipping behavior.
- Performance changes must not break current interaction contracts or weather-driven scene behavior.
