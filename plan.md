# Claim Early Access Backend Integration Plan

Date: 2026-02-12
Repo: `C:\Users\gazin\tbowebsite`
Owner: Frontend + Backend implementation agents

## Objective

Make Claim Early Access fully functional and production-ready by replacing the mock local API layer with a real backend while preserving the existing frontend flow and event contracts.

## Progress Snapshot (2026-02-12)

Status: PR-1, PR-2, PR-4, and PR-7 are completed in the frontend repo. PR-3, PR-5, and PR-6 are completed in backend repo `D:\Code\tbowebsite-backend`.

Completed work:

1. Frontend API abstraction completed.
- Added API contract/interface file: `src/ui/earlyAccessApiContract.ts`.
- Moved prior mock implementation into `src/ui/MockEarlyAccessApi.ts`.
- Added HTTP implementation in `src/ui/HttpEarlyAccessApi.ts` with:
  - centralized `fetch` request helper,
  - envelope parsing for `{ ok: true, data }` and `{ ok: false, error }`,
  - typed response normalization and error conversion.
- Replaced `src/ui/earlyAccessApi.ts` with mode-based wiring:
  - `VITE_EARLY_ACCESS_API_MODE=mock|http`
  - defaults to `mock`.
- Preserved existing method names used by `EarlyAccessOverlay` so overlay call sites remained unchanged.

2. Guardrail fix completed.
- Updated `src/main.ts` so early-access localStorage clearing now runs only when `import.meta.env.DEV` is true.

3. Build verification completed.
- Ran `npm.cmd run build` after changes; TypeScript + Vite build succeeded.
- Existing Three.js chunk-size warning remains informational only.

4. Wallet challenge flow completed (frontend protocol wiring).
- Updated API contract in `src/ui/earlyAccessApiContract.ts` to include:
  - `createWalletChallenge({ publicKey })`,
  - nonce-aware `verifyWallet({ publicKey, nonce, signature })`.
- Updated `src/ui/HttpEarlyAccessApi.ts`:
  - added `POST /wallet/challenge`,
  - updated `POST /wallet/verify` payload to include `nonce`,
  - added strict challenge payload normalization.
- Updated `src/ui/MockEarlyAccessApi.ts`:
  - added mock challenge issuance with nonce + expiry,
  - added nonce/expiry validation in `verifyWallet` to mirror backend flow.
- Updated `src/ui/EarlyAccessOverlay.ts` wallet step to:
  - request challenge from API,
  - sign backend-provided challenge message,
  - verify with `{ publicKey, nonce, signature }`,
  - preserve existing UX/loading/notices and event contracts.

5. Guild integration hardening completed (frontend PR-7).
- Updated `src/ui/EarlyAccessOverlay.ts` so Step 3 re-syncs canonical status (`acceptance`, `acceptanceId`, `guild`) from backend `GET /status` after guild mutations.
- Added accepted-state deep-link join support (`/claim?guild=CODE`) in the no-guild panel.
- Preserved event payload contracts and acceptance ID dispatch behavior.
- Ran `npm.cmd run build`; TypeScript + Vite build succeeded.

Important handoff notes:

1. Backend PR-3, PR-5, and PR-6 are complete in backend repo `D:\Code\tbowebsite-backend`.
- Implemented endpoints: wallet challenge/verify, status, and guild lifecycle endpoints.
- Implemented schema/migrations: `users`, `wallet_challenges`, `auth_sessions`, `early_access_state`, `founder_keys`, `guilds`, `guild_memberships`.
- Founder identifiers are incremental and exposed as `acceptanceId`.

2. Status payload contract update in HTTP mode:
- `GET /status` now returns `acceptanceId` (incremental founder identifier) plus `acceptance` and optional `guild`.
- Frontend keeps legacy fallback support for `founderKey.serial` during transition compatibility.

3. OAuth/community behavior in HTTP mode is still pending:
- `connectX()` opens backend `social/x/connect-url`.
- Discord verification path opens `community/discord/connect-url` then calls `community/discord/verify`.
- Backend callback/session logic for OAuth remains pending (PR-8 and PR-9).

## Progress Update (2026-02-12, 18:10 local)

Status update:

1. Frontend PR-8/PR-9 behavior hardening is implemented in `D:\Code\tbowebsite`.
2. Backend PR-8/PR-9 code implementation is now added in `D:\Code\tbowebsite-backend` (cloned from `https://github.com/kazuolol/tbowebsite-backend`).
3. Live integration validation is blocked by local Postgres authentication.

Completed in this update:

1. Frontend social/OAuth behavior hardening (HTTP mode).
- Updated `src/ui/HttpEarlyAccessApi.ts`:
  - connect-url parsing now supports optional backend `connected` signal,
  - popup-open is no longer treated as verification success,
  - popup blocked now raises explicit error.
- Updated `src/ui/EarlyAccessOverlay.ts`:
  - Step 2 follow/like buttons are not gated by optimistic `xConnected` state,
  - follow/like completion now depends on backend verification responses,
  - user notice text guides retry after OAuth completion,
  - Step 3 checklist label updated to `X follow + like verified`.
- Preserved event payload contracts.

2. Added manual verification checklist for item 1 (`/claim` + `/claim?guild=CODE`).
- New file: `docs/early-access-http-checklist.md`.

3. Backend PR-8 and PR-9 implementation added.
- New migration: `migrations/0004_social_oauth.sql`.
  - Adds `social_accounts` and `oauth_state_tokens` tables.
  - Adds social verification timestamp columns to `early_access_state`.
- New service: `src/services/socialAuthService.ts`.
  - X connect-url, callback, verify-follow, verify-like.
  - Discord connect-url, callback, verify.
  - OAuth state issuance/consumption and session-bound ownership checks.
  - Mock callback fallback when provider credentials are unset.
- Route wiring in `src/routes/earlyAccessRoutes.ts` for:
  - `GET /social/x/connect-url`
  - `GET /social/x/callback`
  - `POST /social/x/verify-follow`
  - `POST /social/x/verify-like`
  - `GET /community/discord/connect-url`
  - `GET /community/discord/callback`
  - `POST /community/discord/verify`
- App/config wiring updates:
  - `src/app.ts`
  - `src/config.ts`
  - `.env.example`
  - `openapi/early-access-wallet-auth.v1.yaml`
  - `README.md`

4. Validation completed for current code state.
- Frontend (`D:\Code\tbowebsite`):
  - `npm.cmd run build` passed.
- Backend (`D:\Code\tbowebsite-backend`):
  - `npm.cmd run typecheck` passed.
  - `npm.cmd run build` passed.
  - `npm.cmd test` passed (`2` test files, `6` tests).

Current blockers:

1. `npm.cmd run db:migrate` in `D:\Code\tbowebsite-backend` failed due DB auth:
- `password authentication failed for user "postgres"` for `postgres://postgres:postgres@localhost:5432/tbo_early_access`.
2. Until `DATABASE_URL`/credentials are corrected and migrations run, live backend smoke checks and end-to-end `/claim` + `/claim?guild=CODE` HTTP-mode validation are blocked.

4. PR-10 production hardening now needs limiter persistence (in-memory vs shared store such as Redis) for multi-instance deployments.

## Verification Snapshot (2026-02-12)

Latest verification run completed on 2026-02-12.

1. Frontend repo (`C:\Users\gazin\tbowebsite`)
- Ran `npm.cmd run build`; build passed.

2. Backend repo (`D:\Code\tbowebsite-backend`)
- Ran `npm.cmd run typecheck`; passed.
- Ran `npm.cmd run build`; passed.
- Ran `npm.cmd test`; passed (`2` test files, `6` tests).
- Ran `npm.cmd run db:migrate`; passed.

3. Live backend smoke checks (`http://localhost:4000`)
- `GET /healthz` returned `200` with `{ ok: true, data: { status: 'ok' } }`.
- `GET /v1/early-access/status` without session returned `401 UNAUTHORIZED`.
- End-to-end scripted checks passed for:
  - wallet challenge and wallet verify (session cookie issuance),
  - nonce single-use replay protection,
  - invalid signature handling,
  - status read with session,
  - guild create/join/lock/unlock/kick,
  - invalid guild code and unauthorized guard behavior.

4. Pending scope confirmation
- `GET /v1/early-access/social/x/connect-url` returned `404 NOT_FOUND`.
- `GET /v1/early-access/community/discord/connect-url` returned `404 NOT_FOUND`.
- This is expected at current stage (PR-8 and PR-9 still pending).

## Non-Negotiable Contracts

1. Keep `tbo:menu-action` payload as `{ action, label }`.
2. Keep `tbo:early-access-claimed` payload as `{ walletPublicKey, status, acceptanceId?, guildCode? }`.
3. Keep current 3-step UX in `src/ui/EarlyAccessOverlay.ts`:
- Step 1 Wallet
- Step 2 Social
- Step 3 Claim/Queue
4. Keep deep-link behavior for `/claim` and `?guild=CODE`.

## Current Frontend Touchpoints

1. Entry and deep links: `src/main.ts`.
2. Trigger UI button: `src/ui/HeaderOverlay.ts`.
3. Core flow and state machine: `src/ui/EarlyAccessOverlay.ts`.
4. API seam to replace: `src/ui/earlyAccessApi.ts`.
5. Shared types: `src/types/EarlyAccess.ts`.

## Immediate Guardrail Fix

Before backend work, update `src/main.ts` so early-access localStorage keys are cleared only in development.
Current behavior clears on every refresh, which is unacceptable in production.

## Target Architecture

1. Frontend keeps current overlay logic and calls an API interface.
2. `HttpEarlyAccessApi` replaces mock behavior for production.
3. Backend service exposes `/v1/early-access/*`.
4. Postgres is the source of truth.
5. Redis job queue handles async verification where needed.
6. OAuth flows for X and Discord terminate on backend callbacks.
7. Frontend localStorage is UI cache only, never source of truth.

## Backend API Contract (v1)

Use a consistent envelope:

- Success: `{ ok: true, data: ... }`
- Error: `{ ok: false, error: { code, message } }`

### Endpoints

1. `POST /v1/early-access/wallet/challenge`
- Request: `{ walletPublicKey }`
- Response: `{ nonce, message, expiresAt }`

2. `POST /v1/early-access/wallet/verify`
- Request: `{ walletPublicKey, nonce, signature }`
- Response: `{ verified, flagged }`

3. `GET /v1/early-access/social/x/connect-url?returnTo=...`
- Response: `{ url }`

4. `POST /v1/early-access/social/x/verify-follow`
- Request: `{}`
- Response: `{ verified }`

5. `POST /v1/early-access/social/x/verify-like`
- Request: `{}`
- Response: `{ verified }`

6. `GET /v1/early-access/community/discord/connect-url?returnTo=...`
- Response: `{ url }`

7. `POST /v1/early-access/community/discord/verify`
- Request: `{}`
- Response: `{ verified }`

8. `GET /v1/early-access/status`
- Response: `{ acceptance, acceptanceId?, guild? }`

9. `POST /v1/early-access/guild`
- Request: `{}`
- Response: `{ guild }`

10. `POST /v1/early-access/guild/join`
- Request: `{ code }`
- Response: `{ guild }`

11. `POST /v1/early-access/guild/lock`
- Request: `{ code }`
- Response: `{ guild }`

12. `POST /v1/early-access/guild/unlock`
- Request: `{ code }`
- Response: `{ guild }`

13. `POST /v1/early-access/guild/kick`
- Request: `{ memberId }`
- Response: `{ guild }`

## Data Model (Postgres)

1. `users`
- `id`, `wallet_public_key` unique, timestamps

2. `wallet_challenges`
- `id`, `user_id`, `nonce` unique, `message`, `expires_at`, `used_at`

3. `social_accounts`
- `id`, `user_id`, `provider` (`x` or `discord`), provider user id, encrypted tokens

4. `early_access_state`
- `user_id` PK
- wallet/social/community verification flags
- acceptance status and score

5. `founder_keys`
- `id`, `user_id` unique, `serial` unique, `key_id` unique

6. `guilds`
- `id`, `code` unique, `capacity`, `is_locked`, `captain_user_id`

7. `guild_memberships`
- `id`, `guild_id`, `user_id`, `status` (`PENDING` or `VERIFIED`)
- unique `(guild_id, user_id)`

8. `audit_events`
- immutable record for critical actions

## Security Requirements

1. Wallet verification must use single-use nonce challenge with strict expiry and replay protection.
2. Session auth must use secure HttpOnly cookies.
3. Add CSRF protection for mutating endpoints if cookie auth is used.
4. Rate-limit sensitive routes per IP and per wallet/session.
5. Enforce backend validation for all request payloads.
6. Encrypt OAuth tokens at rest and rotate keys.
7. Keep guild permission checks server-authoritative (captain-only actions).

## Frontend Integration Tasks

1. Create `EarlyAccessApi` interface.
2. Move current mock into `MockEarlyAccessApi`.
3. Add `HttpEarlyAccessApi` with fetch, typed parsing, and centralized error handling.
4. Wire environment selection (`mock` vs `http`) by Vite env var.
5. Keep all method names used by `EarlyAccessOverlay` unchanged.
6. Update wallet sign flow:
- `challenge` from backend
- sign returned message
- `verify` with signature
7. Keep existing notices/loading states in overlay action handlers.
8. Keep `dispatchClaimedEvent` behavior unchanged.

## Backend Implementation Tasks

1. Define OpenAPI spec first, then generate types.
2. Implement wallet challenge and verify endpoints.
3. Implement session issuance and identity middleware.
4. Implement status resolver and eligibility computation.
5. Implement founder key issuance as idempotent transaction.
6. Implement guild create/join/lock/unlock/kick with captain authorization.
7. Implement OAuth connect and callback handlers for X and Discord.
8. Implement async verification jobs and status refresh jobs where needed.
9. Add structured logs, metrics, and tracing.

## Testing and Quality Gates

1. Unit tests:
- eligibility logic
- founder key idempotency
- guild authorization rules

2. Integration tests:
- wallet challenge/verify
- social verification endpoints
- guild lifecycle endpoints

3. E2E tests:
- full step 1 -> 2 -> 3 flow
- accepted flow
- queue flow
- `/claim?guild=CODE` join flow

4. Contract tests:
- frontend API client against OpenAPI mock or test server

5. Load tests:
- `GET /status`
- wallet verify
- guild join

## Rollout Plan

1. Ship behind feature flag: `VITE_EARLY_ACCESS_API_MODE=mock|http`.
2. Deploy backend to staging and run complete E2E suite.
3. Enable canary users in production with `http` mode.
4. Monitor failures, latencies, and verification success rates for 48 hours.
5. Roll to 100% and keep mock mode only for local development.

## Implementation Backlog (PR by PR)

1. PR-1 Frontend API abstraction (interface + split mock/http). [DONE 2026-02-12]
2. PR-2 Gate localStorage clearing in `src/main.ts` to dev-only. [DONE 2026-02-12]
3. PR-3 Backend wallet auth endpoints + DB tables. [DONE 2026-02-12]
4. PR-4 Frontend wallet challenge/sign/verify flow. [DONE 2026-02-12]
5. PR-5 Backend status computation + founder key issuance. [DONE 2026-02-12]
6. PR-6 Backend guild endpoints + authorization. [DONE 2026-02-12]
7. PR-7 Frontend guild integration against backend. [DONE 2026-02-12]
8. PR-8 X OAuth + follow/like verification implementation. [DONE 2026-02-12: callbacks + verify endpoints implemented in `D:\Code\tbowebsite-backend`; live DB-backed verification still validation-dependent]
9. PR-9 Discord OAuth + community verification implementation. [DONE 2026-02-12: callbacks + verify endpoints implemented in `D:\Code\tbowebsite-backend`; live DB-backed verification still validation-dependent]
10. PR-10 Security hardening, rate limits, and audit logging. [IN PROGRESS 2026-02-13: in-memory rate limiting and origin enforcement added; audit event persistence and route-level logging added]
11. PR-11 E2E/contract/load tests in CI.
12. PR-12 Canary rollout and full production cutover.

## PR-10 Active Work Log

1. Completed now:
  - Added `src/middleware/rateLimit.ts` with request-window enforcement and request-keying by IP/session/wallet.
  - Mounted limiter on `/v1/early-access` in `src/app.ts` with stricter limits for state-changing endpoints.
  - Added backend config entries in `src/config.ts` and `.env.example`:
    - `EARLY_ACCESS_RATE_LIMIT_WINDOW_SECONDS`
    - `EARLY_ACCESS_RATE_LIMIT_MAX_REQUESTS`
    - `EARLY_ACCESS_RATE_LIMIT_SENSITIVE_MAX_REQUESTS`
  - Added origin validation for non-GET requests when `CORS_ORIGIN` is configured.
  - Added `migrations/0005_audit_events.sql` and `src/services/auditService.ts`.
  - Wired non-intrusive audit logging into sensitive routes in `src/routes/earlyAccessRoutes.ts`.
  - Added rate-limit unit test coverage in `tests/rateLimit.test.ts`.

2. Next for PR-10:
  - Add coverage for origin violation behavior in `app.ts` request flow.
  - Decide on production limiter persistence strategy (in-memory vs shared store such as Redis).

## Start-Here Notes For Next Agent

1. PR-1, PR-2, PR-4, and PR-7 are complete in frontend repo `C:\Users\gazin\tbowebsite`.
2. PR-3, PR-5, and PR-6 are complete in backend repo `D:\Code\tbowebsite-backend`.
3. PR-7 frontend updates landed in `src/ui/EarlyAccessOverlay.ts`:
- Step 3 now re-syncs canonical backend status after guild mutations.
- Accepted users with `/claim?guild=CODE` can join invite from the accepted no-guild panel.
4. Continue with PR-8 (X OAuth) and PR-9 (Discord OAuth) in this order:
- Backend: finish callback/session flow for X and Discord so verify endpoints can return real status.
- Frontend (`src/ui/HttpEarlyAccessApi.ts` + `src/ui/EarlyAccessOverlay.ts`): stop treating popup-open as success signal and rely on backend verification responses/status refresh as source of truth.
- Keep community mode in HTTP path as `discord` only unless backend adds email/lore parity.
5. Preserve all event payload contracts exactly (`tbo:menu-action`, `tbo:early-access-claimed` with `acceptanceId`).
6. Treat backend status as canonical and frontend local state as cache only.
7. Verification baseline after each PR:
- Run `npm.cmd run build`.
- Manually validate `/claim` and `/claim?guild=CODE` in `http` mode.

## Immediate Unblock Needed (2026-02-12)

1. Provide working backend `DATABASE_URL` (or local Postgres credentials) for `D:\Code\tbowebsite-backend`.
2. Run `npm.cmd run db:migrate` successfully.
3. Start backend and execute:
- live endpoint smoke checks for the new social endpoints,
- manual checklist in `docs/early-access-http-checklist.md` for `/claim` and `/claim?guild=CODE`.
