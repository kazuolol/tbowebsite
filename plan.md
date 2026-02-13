# Claim Early Access Session Bridge

Date: 2026-02-13
Purpose: temporary cross-session context only.

## Repository Paths (This Environment)

- Frontend repo in this workspace: `D:\Code\tbowebsite`
- Backend repo in this workspace: `D:\Code\tbowebsite-backend`
- Note: `D:\Users\gazin\tbowebsite*` paths were not present in this runtime.

## Current Truth (Authoritative)

1. Frontend and backend contracts are aligned:
- `tbo:menu-action` payload is `{ action, label }`.
- `tbo:early-access-claimed` payload is `{ walletPublicKey, status, acceptanceId?, guildCode? }`.

2. Frontend is now wired for full-stack local flow by default:
- `src/ui/earlyAccessApi.ts` now defaults to `http` mode (mock still supported via env override).
- `VITE_EARLY_ACCESS_API_BASE_URL` is supported.
- `vite.config.ts` now proxies `/v1` and `/healthz` to backend origin (`VITE_DEV_BACKEND_ORIGIN`, default `http://localhost:4000`).
- `.env.example` added for frontend env defaults.

3. PR-11 CI quality gates are automated:
- Frontend CI workflow added: install + build on push/PR.
- Backend CI workflow added with lanes:
  - contract/unit: `typecheck`, `build`, `test`, `smoke:contract`
  - `smoke:e2e`
  - `smoke:load`

4. Backend smoke coverage is now codified:
- Added scripts in `package.json`:
  - `smoke:contract`
  - `smoke:e2e`
  - `smoke:load`
- Added smoke runners:
  - `tests/smoke/runtime.ts`
  - `tests/smoke/contractSmoke.ts`
  - `tests/smoke/e2eSmoke.ts`
  - `tests/smoke/loadSmoke.ts`

5. Backend typing blocker resolved:
- Fixed strict TypeScript test typing in `tests/rateLimit.test.ts`.
- `typecheck` and `build` now pass again.

## Latest Verification (2026-02-13)

Frontend (`D:\Code\tbowebsite`):
- `npm.cmd run build` -> passed

Backend (`D:\Code\tbowebsite-backend`):
- `npm.cmd run typecheck` -> passed
- `npm.cmd run build` -> passed
- `npm.cmd test` -> passed (`3` test files, `9` tests)
- `npm.cmd run smoke:contract` -> passed
- `npm.cmd run smoke:e2e` -> passed
- `npm.cmd run smoke:load` -> passed (`requests=120`, `concurrency=12`, `avgMs=17.20`, `p95Ms=29.74`)

Notes:
- Frontend build still emits the known Three.js chunk-size warning (>500kB); informational.
- In this environment, smoke scripts required elevated execution due to sandbox `spawn EPERM` with `tsx/esbuild`.

## Outstanding Work

1. PR-12 rollout prep:
- Decide production rate-limit persistence strategy (in-memory vs shared store such as Redis).
- Define canary and full-cutover checklist.

2. Social verification production readiness:
- Configure real X OAuth credentials and validate true-positive follow/like path.
- Decide final Discord requirement policy and keep frontend/backend/docs aligned.

3. CI depth expansion:
- Add deeper authenticated endpoint contract/e2e assertions as rollout work lands.

## Session Notes

1. Keep this file concise and operationally current.
2. If flow policy changes, update this file and `docs/early-access-http-checklist.md` together.
3. Use this file as the resume point for the next session.
