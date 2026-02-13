# Claim Early Access Session Bridge

Date: 2026-02-13
Purpose: temporary cross-session context only.

## Decision Note (2026-02-13)

- Product direction update: community funnel should move from Discord to Telegram.
- Source is now Telegram-first in frontend and backend.
- Legacy Discord community endpoints remain temporary compatibility aliases to Telegram handlers.

## Telegram Migration Plan (2026-02-13)

1. Freeze + bridge policy (immediate):
- Do not invest in new Discord-only product work.
- Keep Discord behavior only as a temporary bridge if step-2 gating must remain enforced before Telegram is live.
- If bridge is not required, temporarily relax community gating rather than shipping new Discord dependencies.

2. Contract decisions (frozen):
- Backend evidence model: `communityVerified=true` is canonical only when `early_access_state.telegram_verified_at` is set.
- Backend verification source: `telegram_verified_at` is set only by backend Telegram verify after provider membership check.
- Step-2 UX contract: `Connect Telegram + Verify`, backend-driven verify state, backend-driven retry/failure messaging.
- Event/API compatibility: `tbo:menu-action` and `tbo:early-access-claimed` payload contracts unchanged.

3. Backend implementation (completed in source):
- Add Telegram integration config and verification service path.
- Add/adjust API endpoints for Telegram connect/verify flow.
- Add data-model support for Telegram verification state while preserving backward compatibility with current records.
- Keep rate-limit/audit coverage equivalent to current social/community endpoints.

4. Frontend implementation (completed in source):
- Replace Discord UI/actions in early-access step-2 with Telegram funnel actions.
- Keep backend as source of truth for verification status (no optimistic completion).
- Preserve `/claim` and `/claim?guild=CODE` flow behavior and existing event contracts.

5. CI and smoke transition (in progress):
- Add Telegram credential-backed true-positive smoke coverage.
- Switch CI from Discord fixture lane to Telegram fixture lane once Telegram endpoints are live.
- Retire Discord-specific fixture requirements after Telegram lane is green.

6. Rollout and deprecation:
- Run canary on Telegram flow with real accounts, then full cutover.
- After stable cutover, remove Discord-required gating/config from production policy and docs.

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
- Current shipped implementation uses Telegram verification policy (`VITE_EARLY_ACCESS_REQUIRE_TELEGRAM_VERIFICATION`).
- Backend CI now provisions Postgres, runs migrations, and can enforce DB-required e2e smoke via `SMOKE_E2E_REQUIRE_DB=true`.
- `tests/smoke/e2eSmoke.ts` now includes authenticated wallet/session/status/social/guild assertions when DB is reachable.

7. CI depth increment is now implemented for credential-backed social true-positive checks:
- Added backend smoke script: `npm.cmd run smoke:social-true-positive`.
- Added smoke helpers and runner:
  - `tests/smoke/helpers.ts`
  - `tests/smoke/socialTruePositiveSmoke.ts`
- Backend CI now includes optional `social-true-positive-smoke` lane (runs only when required fixture secrets are present).
- Social true-positive lane now expects Telegram fixture/env keys (`SMOKE_SOCIAL_TELEGRAM_*`, `TELEGRAM_CHAT_ID`).
- Rollout checklist now explicitly includes validating this lane when fixture secrets are configured.

8. Telegram migration implementation landed (frontend + backend):
- Backend:
  - Added Telegram config in `src/config.ts` and migration `0007_telegram_community.sql`.
  - Added Telegram routes:
    - `GET /v1/early-access/community/telegram/connect-url`
    - `GET /v1/early-access/community/telegram/callback`
    - `POST /v1/early-access/community/telegram/verify`
  - Kept `/community/discord/*` routes as compatibility aliases.
  - Updated CI/social smoke env contracts to Telegram fixture keys.
- Frontend:
  - Step-2 community mode now defaults to Telegram (`Connect Telegram + Verify`).
  - HTTP client now calls `/community/telegram/*` endpoints.
  - Legacy local state with `mode='discord'` is normalized to Telegram on restore.
  - Env flag updated to `VITE_EARLY_ACCESS_REQUIRE_TELEGRAM_VERIFICATION`.

## Latest Verification (2026-02-13)

Frontend (`D:\Code\tbowebsite`):
- `npm.cmd run build` -> passed

Backend (`D:\Code\tbowebsite-backend`):
- `npm.cmd run typecheck` -> passed
- `npm.cmd run build` -> passed
- `npm.cmd test` -> passed (`6` test files, `22` tests)
- `npm.cmd run smoke:contract` -> passed
- `npm.cmd run smoke:e2e` -> passed (authenticated assertions run only when DB reachable; local run skipped auth path because `DATABASE_URL` was unreachable)
- `npm.cmd run smoke:load` -> passed (`requests=120`, `concurrency=12`, `avgMs=17.58`, `p95Ms=28.89`)
- `npm.cmd run smoke:social-true-positive` -> expected fail-fast locally (`X_TARGET_USER_ID`/`X_TARGET_HANDLE` fixture targets are not set in this environment)

Notes:
- Frontend build still emits the known Three.js chunk-size warning (>500kB); informational.
- Credential-backed social smoke remains fixture-gated in this environment.
- Backend smoke runners may require elevated execution in this environment due sandbox `spawn EPERM` with `tsx/esbuild`.

## Outstanding Work

1. CI migration:
- Add Telegram fixture secrets and Telegram true-positive smoke lane.
- Execute first green Telegram credential-backed smoke run in CI and capture run URL + outcome in this file.
- Decommission Discord-specific smoke fixture lane after Telegram lane is stable.

2. Rollout execution:
- Run Telegram canary checklist and full cutover checklist from `docs/early-access-http-checklist.md`.
- Capture canary/cutover outcomes and any corrective actions in this file.

## Session Notes

1. Keep this file concise and operationally current.
2. If flow policy changes, update this file and `docs/early-access-http-checklist.md` together.
3. Use this file as the resume point for the next session.
