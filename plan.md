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
- Telegram credential-backed true-positive smoke coverage is implemented in code (`social-true-positive-smoke` job), but is fixture-secret gated.
- Once Telegram fixture secrets are configured, run CI and capture the first green run URL + timestamp here.
- Decommission any remaining Discord-specific fixture docs/policy after Telegram lane is stable (no Discord-only lanes remain in CI).

6. Rollout and deprecation:
- Run canary on Telegram flow with real accounts, then full cutover.
- After stable cutover, remove Discord-required gating/config from production policy and docs.

## Repository Paths (Machine-Dependent)

Avoid drive-letter pinning (laptop uses `C:\`, desktop uses `D:\`).

- Frontend repo root (from anywhere inside repo): `git rev-parse --show-toplevel`
- Backend repo root (from anywhere inside repo): `git rev-parse --show-toplevel`
- Optional helper (from frontend repo): `powershell -ExecutionPolicy Bypass -File .\scripts\where-repos.ps1`

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

## Latest Verification (2026-02-14)

Frontend (`tbowebsite`):
- `npm.cmd run build` -> passed

Backend (`tbowebsite-backend`):
- `npm.cmd run typecheck` -> passed
- `npm.cmd run build` -> passed
- `npm.cmd test` -> passed (`6` test files, `22` tests)
- `npm.cmd run smoke:contract` -> passed
- `npm.cmd run smoke:e2e` -> passed (authenticated assertions run only when DB reachable; local run skipped auth path because `DATABASE_URL` was unreachable)
- `npm.cmd run smoke:load` -> passed (`requests=120`, `concurrency=12`, `avgMs=22.07`, `p95Ms=39.16`)
- `npm.cmd run smoke:social-true-positive` -> expected fail-fast locally (`X_TARGET_USER_ID`/`X_TARGET_HANDLE` fixture targets are not set in this environment)

Notes:
- Frontend build still emits the known Three.js chunk-size warning (>500kB); informational.
- Credential-backed social smoke remains fixture-gated in this environment.
- Backend smoke runners executed successfully in this environment (no `spawn EPERM` observed); if you hit `spawn EPERM`, rerun outside sandbox/elevation.

## Cloudflare Pages Cutover (2026-02-15)

Goal: serve `https://thebigone.gg` from Cloudflare Pages with headless CI deploys, SPA deep links, and `www -> apex` redirect (without breaking Google Workspace email).

Current truth:
- Zone `thebigone.gg` is active in Cloudflare (DNS authority moved from GoDaddy).
- Pages project: `tbowebsite` (default URL: `https://tbowebsite-4er.pages.dev`).
- Custom domain `https://thebigone.gg` is attached to the Pages project and serves the frontend.
- `https://www.thebigone.gg/*` redirects to `https://thebigone.gg/*` via Cloudflare redirect rules.
- SPA deep link `/claim` works on direct hits:
  - `/claim` -> `/claim/` (308)
  - `/claim/*` -> `/index.html` (200)

Implementation notes (repo):
- Frontend deploy workflow (direct upload): `.github/workflows/deploy-cloudflare-pages.yml`
- Cloudflare configuration workflow (domains + redirects + DNS): `.github/workflows/configure-cloudflare.yml`
- SPA routing rules: `public/_redirects`
- Frontend production build config is injected via GitHub Actions repo variables:
  - `VITE_EARLY_ACCESS_API_MODE` (currently set to `mock` until the production API is deployed)
  - `VITE_EARLY_ACCESS_API_BASE_URL` (planned: `https://api.thebigone.gg/v1/early-access`)
  - `VITE_EARLY_ACCESS_REQUIRE_TELEGRAM_VERIFICATION`

Incident log:
- Do not assume `${CF_PAGES_PROJECT_NAME}.pages.dev` is the Pages origin. Cloudflare assigns a suffixed subdomain.
  - Actual project subdomain is read from Pages API `result.subdomain` (ex: `tbowebsite-4er.pages.dev`).
- Attempting to A-record the apex to Pages anycast IPs can trigger Cloudflare Error 1000 ("DNS points to prohibited IP").

Security:
- Cloudflare API token was pasted into chat during troubleshooting. Treat it as compromised:
  - Rotate the token in Cloudflare.
  - Update GitHub Actions secret `CLOUDFLARE_API_TOKEN` with the rotated token.

## Outstanding Work

1. CI migration:
- Configure GitHub Actions secrets so the backend `social-true-positive-smoke` job can run (note: lane is gated to non-PR events).
- Required secrets:
  - `SMOKE_SOCIAL_X_PROVIDER_USER_ID`
  - `SMOKE_SOCIAL_X_ACCESS_TOKEN`
  - `SMOKE_SOCIAL_X_TARGET_TWEET_ID`
  - `SMOKE_SOCIAL_X_TARGET_USER_ID` (or `SMOKE_SOCIAL_X_TARGET_HANDLE`)
  - `SMOKE_SOCIAL_TELEGRAM_PROVIDER_USER_ID`
  - `SMOKE_SOCIAL_TELEGRAM_ACCESS_TOKEN`
  - `SMOKE_SOCIAL_TELEGRAM_CHAT_ID`
  - Optional: `SMOKE_SOCIAL_X_USERNAME`, `SMOKE_SOCIAL_TELEGRAM_USERNAME`
- Execute first green Telegram credential-backed smoke run in CI and capture run URL + outcome in this file.

2. Rollout execution:
- Run Telegram canary checklist and full cutover checklist from `docs/early-access-http-checklist.md`.
- Capture canary/cutover outcomes and any corrective actions in this file.

3. Backend URL (production):
- Frontend defaults to `http` mode with `VITE_EARLY_ACCESS_API_BASE_URL=/v1/early-access` (same-origin).
- On production Pages, `/v1/early-access/*` currently resolves to Pages HTML, not backend JSON, so the claim flow will fail until the API is deployed and routed.
- Decide and implement one of:
  - Dedicated API host (recommended): deploy backend at `https://api.thebigone.gg` and set:
    - Frontend: `VITE_EARLY_ACCESS_API_BASE_URL=https://api.thebigone.gg/v1/early-access`
    - Backend: `PUBLIC_BASE_URL=https://api.thebigone.gg`, `CORS_ORIGIN=https://thebigone.gg`, `SESSION_COOKIE_SECURE=true`
  - Same-origin proxy: keep frontend base URL as `/v1/early-access` and add a Cloudflare Worker route for `/v1/early-access/*` that proxies to the backend host (avoids CORS).

Selected: Dedicated API host (`https://api.thebigone.gg`).
Next steps:
- Deploy backend and Postgres to production.
  - Current implementation target: Fly.io (Docker + `fly.toml` + GitHub Actions deploy).
  - Backend repo now includes:
    - `Dockerfile`, `.dockerignore`
    - `fly.toml` (app name placeholder currently `tbo-api`)
    - `.github/workflows/deploy-fly.yml` (deploys on push to `master`/`main`)
  - Important fix: backend migrations now resolve `migrations/` from `process.cwd()` so compiled migrations can run in containers.
  - Required production env (set as host secrets/vars, not committed):
    - `DATABASE_URL`
    - `NODE_ENV=production`
    - `PUBLIC_BASE_URL=https://api.thebigone.gg`
    - `CORS_ORIGIN=https://thebigone.gg`
    - `SESSION_COOKIE_SECURE=true`
    - `EARLY_ACCESS_RATE_LIMIT_STORE=postgres`
    - Plus X + Telegram OAuth config when enabling step-2 social/community verification.
- Create Cloudflare DNS record for `api.thebigone.gg` pointing at the backend origin.
  - `.github/workflows/configure-cloudflare.yml` now accepts `api_target` and can create/update the CNAME for `api`.
- Flip frontend build variable `VITE_EARLY_ACCESS_API_MODE` from `mock` -> `http` and set:
  - `VITE_EARLY_ACCESS_API_BASE_URL=https://api.thebigone.gg/v1/early-access`

Test environment mode (avoid writing to production DB):
- Use a non-production frontend deployment with `VITE_EARLY_ACCESS_API_MODE=mock` (no backend writes at all), or point to a staging API+DB.
- Frontend deploy workflow supports manual “test-mode” preview deploys via `workflow_dispatch` inputs:
  - `pages_branch=test-mode` (creates a preview deployment)
  - `api_mode=mock` (or `http` with staging base URL)


## Session Notes

1. Keep this file concise and operationally current.
2. If flow policy changes, update this file and `docs/early-access-http-checklist.md` together.
3. Use this file as the resume point for the next session.
