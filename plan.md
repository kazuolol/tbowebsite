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

6. PR-12 rollout prep is now codified in source:
- Backend rate limiter supports shared persistence via `EARLY_ACCESS_RATE_LIMIT_STORE` (`postgres` or `memory`).
- Production default strategy is now shared `postgres`; local/test default remains `memory`.
- Added migration `0006_rate_limit_buckets.sql` for shared rate-limit buckets.
- Rollout docs now include explicit canary and full cutover checklists.
- Discord policy is now explicit: required in production flow (`VITE_EARLY_ACCESS_REQUIRE_DISCORD_VERIFICATION=true`).
- Backend CI now provisions Postgres, runs migrations, and can enforce DB-required e2e smoke via `SMOKE_E2E_REQUIRE_DB=true`.
- `tests/smoke/e2eSmoke.ts` now includes authenticated wallet/session/status/social/guild assertions when DB is reachable.

## Latest Verification (2026-02-13)

Frontend (`D:\Code\tbowebsite`):
- `npm.cmd run build` -> passed

Backend (`D:\Code\tbowebsite-backend`):
- `npm.cmd run typecheck` -> passed
- `npm.cmd run build` -> passed
- `npm.cmd test` -> passed (`6` test files, `22` tests)
- `npm.cmd run smoke:contract` -> passed
- `npm.cmd run smoke:e2e` -> passed (authenticated assertions run only when DB reachable; local run skipped auth path because `DATABASE_URL` was unreachable)
- `npm.cmd run smoke:load` -> passed (`requests=120`, `concurrency=12`, `avgMs=17.69`, `p95Ms=29.88`)

Notes:
- Frontend build still emits the known Three.js chunk-size warning (>500kB); informational.
- In this environment, smoke scripts required elevated execution due to sandbox `spawn EPERM` with `tsx/esbuild`.

## Outstanding Work

1. Social verification production readiness:
- Configure real X OAuth + Discord OAuth credentials and `DISCORD_GUILD_ID` in production env.
- Validate true-positive follow/like/discord verification path against real providers.

2. Rollout execution:
- Run canary checklist and full cutover checklist from `docs/early-access-http-checklist.md`.
- Capture canary/cutover outcomes and any corrective actions in this file.

3. CI depth (next increment):
- Add credential-backed preprod e2e coverage for true-positive social verification when secure test fixtures are available.

## Session Notes

1. Keep this file concise and operationally current.
2. If flow policy changes, update this file and `docs/early-access-http-checklist.md` together.
3. Use this file as the resume point for the next session.
