# Performance Optimization Plan

Date: 2026-02-10
Repo: `D:\code\tbowebsite`

## Objective

Deliver the highest possible runtime performance gain with minimal change to the current website aesthetic.

The primary bottleneck is render submission overhead (draw calls), not triangle count.
Current reference capture shows about `453` draw calls with about `36k` triangles.

## Progress Snapshot (Updated 2026-02-10)

Overall status: `In progress`

Completed work:
- P0 core work implemented in `buildFriendsIcon.ts` and `buildGlobeIcon.ts`.
- P1 implemented in `FallingScene.ts` with instanced cubes and instanced fragments.
- P2 implemented in `FallingScene.ts` with sustained-pressure adaptive scaling (fragments first, then cube density).
- P3 implemented in `MenuIcon3D.ts`, `CharacterOrbitCarousel.ts`, and `HeaderOverlay.ts`:
  - removed redundant per-frame static icon transform writes
  - froze matrix updates for static icon subtrees while keeping animated nodes live
  - cached carousel render-order/scale writes to avoid redundant property churn
  - gated header weather icon redraw/text writes to state changes
- Runtime perf toggles added in `FallingScene.ts`:
  - `tboOrbitIcons`
  - `tboCubes`
  - `tboWeather`
- Weather visibility hook added in `WeatherParticles.ts`.
- Post-P3 integrated runtime perf capture recorded in `perf-capture.latest.json`.
- Post-P3 warm runtime perf capture recorded in `perf-capture.warm.latest.json`.
- Build verification currently passing with `npm.cmd run build`.

Pending work:
- Collect per-phase/toggle-isolated captures with `?tboPerf=1` for attribution.
- Confirm draw-call target (`<200`) across additional comparable captures.
- Run visual parity QA against references.
- Optional P0 follow-up for `buildInboxIcon.ts` if capture results show it remains a significant call contributor.

## Latest Capture Snapshots (2026-02-10)

- Capture A source: `perf-capture.latest.json`
- Timestamp (UTC): `2026-02-10T20:05:41.614Z`
- URL: `http://127.0.0.1:43234/?tboPerf=1`
- Mode: `edge-cdp-headless`
- GPU renderer: `ANGLE (NVIDIA GeForce RTX 3090, D3D11)`
- Frame avg/p95/worst: `5.24 / 14.80 / 29.30 ms`
- Estimated FPS / samples: `190.7 / 600`
- Renderer calls/triangles/lines/points: `126 / 41117 / 4680 / 0`
- Renderer textures/geometries/programs: `30 / 79 / 26`
- Page warning counts: `0 warnings`, `0 errors`
- Draw-call target check (`<200`): `Pass` in this capture
- Capture B source: `perf-capture.warm.latest.json` (22s warmup before sampling)
- Timestamp (UTC): `2026-02-10T21:04:25.031Z`
- URL: `http://127.0.0.1:43234/?tboPerf=1`
- Mode: `edge-cdp-headless-warm`
- GPU renderer: `ANGLE (NVIDIA GeForce RTX 3090, D3D11)`
- Frame avg/p95/worst: `5.40 / 14.80 / 26.40 ms`
- Estimated FPS / samples: `185.0 / 600`
- Renderer calls/triangles/lines/points: `130 / 41361 / 4680 / 0`
- Renderer textures/geometries/programs: `32 / 80 / 26`
- Page warning counts: `0 warnings`, `0 errors`
- Draw-call target check (`<200`): `Pass` in warmed capture
- Capture C source: `perf-capture.warm.after-cull.json` (post near-camera hard cull)
- Timestamp (UTC): `2026-02-10T21:49:59.694Z`
- URL: `http://127.0.0.1:43234/?tboPerf=1`
- Mode: `edge-cdp-headless-warm-after-cull`
- GPU renderer: `ANGLE (NVIDIA GeForce RTX 3090, D3D11)`
- Frame avg/p95/worst: `4.64 / 8.60 / 17.60 ms`
- Estimated FPS / samples: `215.3 / 600`
- Renderer calls/triangles/lines/points: `126 / 41294 / 4680 / 0`
- Renderer textures/geometries/programs: `30 / 79 / 26`
- Draw-call target check (`<200`): `Pass` in post-cull warmed capture

## Visual and Contract Guardrails

No visual drift from the current design language:
- No changes to page layout, typography, palette, or scene art direction.
- Preserve existing motion style and interaction behavior.
- Keep icon silhouettes and proportions visually equivalent.

No contract drift from AGENTS.md:
- Keep `tbo:menu-action` payload as `{ action, label }`.
- Keep `tbo:local-weather-update` feeding `FallingScene`.
- Keep `ORBIT_LAYER = 2` behavior intact.

## Performance Targets

- Reduce draw calls from about `453` to below `200`.
- Improve or hold p95 frame time in interactive desktop capture.
- Maintain visual parity under normal user viewing distance.

## Measurement Method (Before and After Each Phase)

1. Add temporary runtime toggles in `FallingScene` for:
- orbit carousel icons
- cubes and fragments
- weather particles

Status:
- Implemented via query params:
  - `tboOrbitIcons`
  - `tboCubes`
  - `tboWeather`

2. For each phase, capture:
- average, p95, worst frame time
- estimated FPS
- `renderer.info` calls, triangles, textures, geometries, programs

3. Keep captures comparable:
- same URL mode (`?tboPerf=1`)
- same viewport class
- same warmup time

## Prioritized Work Plan

### P0 (Highest ROI): Reduce in-world icon draw calls

Status: `Partially complete (core implemented, integrated capture complete, phase-isolated capture pending)`

Primary target:
- `src/ui/menu-icon/buildFriendsIcon.ts`
- `src/ui/menu-icon/buildGlobeIcon.ts`
- `src/ui/menu-icon/buildInboxIcon.ts`
- used by `src/environment/CharacterOrbitCarousel.ts`

Actions:
- Convert repeated friends icon mesh sets to `InstancedMesh` where geometry/material are shared.
- Collapse globe line objects into fewer buffers/objects.
- Keep current transforms, color values, and material styling so appearance remains consistent.

Implemented:
- Friends icon repeated key/screw meshes now use instancing.
- Globe icon line objects were consolidated into batched line segment buffers.
- Globe connector and hub marker meshes were converted to instanced rendering.

Outstanding:
- `buildInboxIcon.ts` was not changed in this pass.

Expected result:
- Largest draw-call reduction with low aesthetic risk.

### P1: Batch cubes and fragments

Status: `Implemented, integrated capture complete, phase-isolated capture pending`

Primary target:
- `src/scene/FallingScene.ts`

Actions:
- Replace per-cube meshes/material clones with bucketed instancing.
- Instance fragment rendering where practical while preserving lifecycle and fade behavior.
- Keep weather-driven motion profile and current size distribution.

Implemented:
- Cubes now render through a single `InstancedMesh` path with per-instance opacity/emissive attributes.
- Fragments now render through a single `InstancedMesh` path with per-instance lifecycle-driven opacity/emissive updates.
- Existing weather-driven movement and randomness profile were retained.

Expected result:
- Major additional draw-call and CPU update reduction with minimal visible change.

### P2: Adaptive quality only when performance is constrained

Status: `Implemented, integrated capture complete, phase-isolated capture pending`

Primary target:
- `src/environment/WeatherParticles.ts`
- `src/scene/FallingScene.ts`

Actions:
- Expand adaptive scaling to reduce fragment load first, then cube density, only after sustained frame-pressure thresholds.
- Avoid quality reduction on capable hardware.

Implemented:
- Added sustained-frame-pressure logic in `FallingScene`.
- Degrade order is fragment budget first, then cube density.
- Recovery order is reversed to restore full quality on stable frame times.

Expected result:
- Better stability on low-end devices without changing high-end visual output.

### P3: Micro-optimizations and cleanup

Targets:
- `src/ui/MenuIcon3D.ts`
- `src/environment/CharacterOrbitCarousel.ts`
- `src/ui/HeaderOverlay.ts`

Status: `Implemented, integrated capture complete, phase-isolated capture pending`

Actions:
- Keep canvas texture uploads gated to meaningful state changes.
- Remove any redundant per-frame transforms or property writes in icon paths.
- Retain current interaction behavior and animation cadence.

Implemented:
- `MenuIcon3D.ts`: moved static transforms to initialization, removed redundant per-frame static assignments, and froze matrix updates for static icon nodes.
- `CharacterOrbitCarousel.ts`: cached scale/render-order writes to avoid unnecessary per-frame property updates.
- `HeaderOverlay.ts`: weather icon redraw and date/weather text writes now run only when visible state changes.

Expected result:
- Small but reliable frame-time improvements and less jitter.

## Execution Cadence

1. `Complete` Baseline reference capture recorded (`~453` draw calls).
2. `Implemented / integrated capture complete / phase-isolated capture pending` P0.
3. `Implemented / integrated capture complete / phase-isolated capture pending` P1.
4. `Implemented / integrated capture complete / phase-isolated capture pending` P2.
5. `Implemented / integrated capture complete / phase-isolated capture pending` P3.
6. `Pending` visual parity QA against reference screenshots.

## Success Criteria

- Draw calls reduced below target or materially lower than baseline.
- No regression in event contracts or orbit carousel interaction.
- No meaningful aesthetic drift in icon appearance, scene composition, or animation feel.
- Build passes with `npm.cmd run build`.

## Rollback Strategy

Each phase is scoped to a small set of files.
If visual drift appears, rollback the specific phase and keep prior wins.
Do not merge optimization changes without paired perf capture and visual check.
