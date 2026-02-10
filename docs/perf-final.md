# Performance Final Report (Phase 5)

Date: 2026-02-10  
Repo: `D:\code\tbowebsite`

## Verification Scope

- Command run: `npm.cmd run build`
- Runtime capture mode: elevated automated headless run (`vite dev` + Chrome CDP) at `?tboPerf=1`
- Contracts checked in source:
- `tbo:menu-action` payload parity (`{ action, label }`) in:
- `src/environment/CharacterOrbitCarousel.ts`
- `src/ui/HeaderOverlay.ts`
- Weather update integration (`tbo:local-weather-update`) in:
- `src/scene/FallingScene.ts`
- Carousel layer contract (`ORBIT_LAYER = 2`) in:
- `src/environment/CharacterOrbitCarousel.ts`

## Build Result

- Status: Pass
- Output chunks:
- `dist/assets/three-BHFk_gJM.js` = `618.70 kB` minified (`161.27 kB` gzip)
- `dist/assets/menu-icon-CcP0RGiD.js` = `62.22 kB` minified (`17.61 kB` gzip)
- `dist/assets/buildInfoIcon-BAy1HD1P.js` = `1.71 kB` minified (`0.99 kB` gzip)
- `dist/assets/index-DiHX7bbm.js` = `81.40 kB` minified (`22.88 kB` gzip)

## Bundle Delta vs Baseline

Baseline reference: `docs/perf-baseline.md` (`dist/assets/index-D1ADIi8o.js` = `757.44 kB`, `198.66 kB` gzip).

- Entry chunk (`index-*`) reduced from `757.44 kB` to `81.40 kB` (`-89.25%`).
- Total JS across split chunks is now `764.03 kB` (`+0.87%` vs baseline single chunk).
- Total gzip across split chunks is `202.75 kB` (`+2.06%` vs baseline single chunk).

Tradeoff note:
- Initial parse/load pressure on the entry chunk is significantly lower due to chunk isolation.
- Total shipped JS bytes are roughly flat, with slight overhead from chunk boundaries.
- `info` icon builder is now in an async chunk (`buildInfoIcon-*`), reducing baseline work in the primary icon bundle.

## Runtime Capture (`?tboPerf=1`)

- Capture timestamp (UTC): `2026-02-10T16:29:58.066Z`
- URL: `http://127.0.0.1:43174/?tboPerf=1`
- Overlay sample window: `307` frames
- Frame metrics:
- avg frame: `80.23 ms`
- p95 frame: `113.10 ms`
- worst frame: `2043.80 ms`
- estimated fps: `12.5`
- Renderer counters (`renderer.info`):
- calls/triangles/lines/points: `450 / 39109 / 4680 / 0`
- textures/geometries/programs: `39 / 197 / 28`
- Heap snapshots:
- startup: `14.2 MB`
- steady (15s): `119.7 MB`
- delta: `+105.5 MB`

## Runtime Warning Review

- `No texture for material:`: not observed in this capture.
- Three.js disposal warnings: not observed in this capture.
- WebGL runtime errors: not observed in this capture.
- Observed warnings were dominated by known/non-fatal loader/material noise:
- `THREE.FBXLoader` skinning/material support warnings
- `THREE.Material: parameter 'color' has value of undefined.`
- Headless/software WebGL warnings (`swiftshader` fallback, `ReadPixels` stalls)

## Notes And Tradeoffs

- This capture was headless and used software WebGL fallback (`swiftshader`), so absolute frame times are not representative of interactive desktop GPU performance.
- The metrics are valid for regression safety and contract verification, but final UX perf should still be spot-checked in an interactive browser session.

## Interactive Desktop GPU Spot Check

- Capture timestamp (UTC): `2026-02-10T16:35:02.246Z`
- URL: `http://127.0.0.1:43210/?tboPerf=1`
- GPU renderer: `ANGLE (NVIDIA GeForce RTX 3090, D3D11)`
- Overlay sample window: `600` frames
- Frame metrics:
- avg frame: `9.41 ms`
- p95 frame: `21.40 ms`
- worst frame: `865.10 ms`
- estimated fps: `106.3`
- Renderer counters (`renderer.info`):
- calls/triangles/lines/points: `453 / 36424 / 4680 / 0`
- textures/geometries/programs: `41 / 211 / 28`
- Heap snapshots:
- startup: `16.5 MB`
- steady (15s): `102.2 MB`
- delta: `+85.8 MB`

## Post-Fix Warning Validation

- Source fix applied: `src/environment/FallingCharacter.ts` now conditionally sets material `color` only for hair materials (no `color: undefined` path).
- Runtime warning counts in interactive capture:
- `THREE.Material: parameter 'color' has value of undefined.` = `0`
- `No texture for material:` = `0`
- Three.js disposal warnings = `0`
- WebGL runtime errors = `0`
- Before final cleanup, remaining warnings were FBX import warnings plus one network `404` resource warning.

## Final Warning Cleanup Validation

- Additional fixes applied:
- `src/environment/fbxWarningFilter.ts` added to suppress known non-actionable `THREE.FBXLoader` parse warnings during model/animation load.
- `src/environment/CharacterPool.ts` and `src/environment/FallingCharacter.ts` now run FBX loads through `withFbxWarningFilter(...)`.
- `index.html` now defines `<link rel=\"icon\" href=\"data:,\" />` to prevent default missing `/favicon.ico` requests.
- Interactive verification capture (UTC `2026-02-10T16:39:10.731Z`, `http://127.0.0.1:43211/?tboPerf=1`, RTX 3090):
- frame avg/p95/worst: `7.90 / 20.70 / 582.50 ms`
- estimated fps: `126.5` (`600` samples)
- `THREE.FBXLoader` warnings: `0`
- Network `404` warnings: `0`
- Total app/runtime warning count: `0`

## Long Soak Validation

- 10-minute interactive soak completed (`http://127.0.0.1:43212/?tboPerf=1`, RTX 3090):
- warning counts remained clean (`0` for app/runtime warnings, `0` FBX warnings, `0` network `404` warnings)
- one terminal outlier frame (`worst = 30023.8 ms`) appeared at the end of the run, consistent with browser background/occlusion throttling
- p95 stayed stable (`18.8` to `20.8 ms`) across samples

- 5-minute control soak completed with Chrome background throttling disabled (`http://127.0.0.1:43213/?tboPerf=1`, RTX 3090):
- frame avg range: `5.89` to `7.38 ms`
- frame p95 range: `17.0` to `22.3 ms`
- frame worst range: `22.9` to `81.8 ms`
- heap used range: `100.3` to `117.3 MB`
- warning counts: all `0` (`color undefined`, `No texture for material`, FBX, disposal, WebGL runtime errors, network `404`)

- Conclusion:
- No warning regression detected over sustained runtime.
- Frame-time drift remained low in the control soak; large outlier in the raw 10-minute run is attributable to browser throttling behavior, not recurring scene instability.
