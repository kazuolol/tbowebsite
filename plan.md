# Claim Early Access Session Bridge

Date: 2026-02-13
Frontend repo: `C:\Users\gazin\tbowebsite`
Backend repo: `C:\Code\tbowebsite-backend`
Purpose: temporary cross-session context only.

## Current Truth (Authoritative)

1. Frontend and backend are aligned on event contracts:
- `tbo:menu-action` payload is `{ action, label }`.
- `tbo:early-access-claimed` payload is `{ walletPublicKey, status, acceptanceId?, guildCode? }`.

2. Backend hardening is implemented:
- OAuth callback mock mode is config-controlled only (not query-controlled).
- Connect-url endpoints fail with `503 OAUTH_NOT_CONFIGURED` when OAuth creds are missing and fallback is disabled.
- Social verification fails closed with `503 SOCIAL_VERIFICATION_NOT_CONFIGURED` when required targets are missing.
- X follow/like verification scans paginated X API responses (bounded pages, early exit on match).
- Mutating cookie-auth requests require valid `Origin` and reject missing/mismatched origin.

3. Frontend flow decisions:
- X defaults updated to `@THEBIGONEGG` and tweet `2022049710362829065`.
- Discord verification is currently optional in UI flow by default.
- Discord can be re-required by setting `VITE_EARLY_ACCESS_REQUIRE_DISCORD_VERIFICATION=true`.

4. Local env state now used for smoke:
- Backend `.env` includes `X_TARGET_HANDLE=THEBIGONEGG` and `X_TARGET_TWEET_ID=2022049710362829065`.
- Discord guild target intentionally unset for now.

## Outstanding Work

1. PR-11 quality gates:
- Add CI automation for contract/E2E/load coverage.
- Promote smoke checks into repeatable CI jobs.

2. PR-12 rollout prep:
- Decide production rate-limit persistence (in-memory vs shared store such as Redis).
- Define canary and full-cutover checklist.

3. Social verification production readiness:
- Configure real X OAuth credentials and validate true positive follow/like path.
- Keep Discord optional or re-require it explicitly, then update this file accordingly.

## Latest Verification (2026-02-13)

Commands run and passing:

Frontend (`C:\Users\gazin\tbowebsite`):
- `npm.cmd run build`

Backend (`C:\Code\tbowebsite-backend`):
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd test` (6 test files, 21 tests)
- `npm.cmd run db:migrate`

Manual/smoke outcomes:
- `/claim` and `/claim?guild=CODE` load.
- Wallet challenge/verify/session flow works.
- OAuth connect-url and callback routing works.
- X verify endpoints return `200` with `verified: false` (expected until real OAuth provider tokens/relationship checks succeed in a real user flow).
- Discord verify returns `503 SOCIAL_VERIFICATION_NOT_CONFIGURED` (expected in current optional-Discord mode).
- Guild create/join/lock/unlock/kick flows work when mutating requests include valid origin.

## Session Notes

1. Backend listener currently runs from built output (`node dist/server.js`) after env reload.
2. Keep `docs/early-access-http-checklist.md` in sync with any future flow-policy changes.
3. This file should stay concise and only track live operational state.
