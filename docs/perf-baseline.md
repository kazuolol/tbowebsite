# Performance Baseline (Phase 0)

Date: 2026-02-10  
Repo: `C:\Users\gazin\tbowebsite`

## Capture Setup

- Build command: `npm.cmd run build`
- Dev run command: `npm.cmd run dev`
- Perf monitor toggle (dev only):
- Enable: `http://localhost:5173/?tboPerf=1`
- Disable: `http://localhost:5173/?tboPerf=0`

The monitor reports:

- Frame timing: average / p95 / worst
- Estimated FPS
- `renderer.info` counters (draw calls, triangles, lines, points, textures, geometries, programs)
- Heap usage (if `performance.memory` is available)
- Startup + steady heap snapshots (steady capture at ~15s)

## Baseline Snapshot (Before Optimizations)

| Metric | Value |
| --- | --- |
| Build status | Pass |
| Main JS chunk | `dist/assets/index-D1ADIi8o.js` |
| Main JS size (minified) | 757.44 kB |
| Main JS size (gzip) | 198.66 kB |
| Character models loaded at startup | ~15.194 MB on disk |
| Character textures loaded at startup | ~20.291 MB on disk |
| Approx decoded texture VRAM footprint | ~640 MB |

## Capture Checklist

1. Desktop viewport capture:
- Open dev server with `?tboPerf=1`.
- Let scene settle for 30s and record monitor values.
2. Mobile-sized viewport capture:
- Repeat with responsive/mobile viewport and record values.
3. Build verification:
- Run `npm.cmd run build` and confirm success.

## Target Budgets

- Stable 60 FPS on desktop steady-state.
- Improve p95 frame time by at least 20% vs baseline.
- Improve startup time to first stable render by at least 20%.
