# Claim Early Access Backend Integration Plan

Date: 2026-02-12
Repo: `C:\Users\gazin\tbowebsite`
Owner: Frontend + Backend implementation agents

## Objective

Make Claim Early Access fully functional and production-ready by replacing the mock local API layer with a real backend while preserving the existing frontend flow and event contracts.

## Progress Snapshot (2026-02-12)

Status: PR-1, PR-2, and PR-4 are completed in the frontend repo. PR-3, PR-5, and PR-6 are completed in backend repo `C:\Code\tbowebsite-backend`.

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

Important handoff notes:

1. Backend PR-3, PR-5, and PR-6 are complete in backend repo `C:\Code\tbowebsite-backend`.
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
7. PR-7 Frontend guild integration against backend.
8. PR-8 X OAuth + follow/like verification implementation.
9. PR-9 Discord OAuth + community verification implementation.
10. PR-10 Security hardening, rate limits, and audit logging.
11. PR-11 E2E/contract/load tests in CI.
12. PR-12 Canary rollout and full production cutover.

## Start-Here Notes For Next Agent

1. PR-1, PR-2, and PR-4 are complete in frontend repo `C:\Users\gazin\tbowebsite`.
2. PR-3, PR-5, and PR-6 are complete in backend repo `C:\Code\tbowebsite-backend`.
3. Continue with PR-7 (frontend guild integration against backend), then PR-8 (X OAuth) and PR-9 (Discord OAuth).
4. Preserve all event payload contracts exactly (`tbo:menu-action`, `tbo:early-access-claimed` with `acceptanceId`).
5. Treat backend status as canonical and frontend local state as cache only.
