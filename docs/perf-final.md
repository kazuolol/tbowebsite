# Performance Final Report (Phase 5)

Date: 2026-02-10  
Repo: `C:\Users\gazin\tbowebsite`

## Verification Scope

- Command run: `npm.cmd run build`
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

## Runtime Validation Notes

- Automated CLI verification completed for build + contract parity.
- Phase 4 state-change cleanup validated in code:
- `src/environment/WeatherParticles.ts` opacity updates no longer force `material.needsUpdate`.
- Non-interactive dev startup smoke completed:
- `npm.cmd run dev -- --host 127.0.0.1 --port 4174 --strictPort` bound to `127.0.0.1:4174` during check.
- Manual browser validation is still required for:
- WebGL runtime errors
- Three.js disposal warnings
- Texture warning trend (`No texture for material:`)
- Dev perf monitor capture (`?tboPerf=1`) for final avg/p95/worst frame metrics.
