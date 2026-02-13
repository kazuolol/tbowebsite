# Early Access HTTP-Mode Verification Checklist

Last updated: 2026-02-13 (Telegram contract frozen + implemented)
Scope: frontend `/claim` and `/claim?guild=CODE` with `VITE_EARLY_ACCESS_API_MODE=http`

## Direction (2026-02-13)

- Community funnel target is Telegram.
- Current shipped implementation is Telegram-based.
- Legacy Discord community endpoints are temporary compatibility aliases to Telegram handlers.
- Do not expand Discord scope beyond bridge support while Telegram migration is in progress.

## Transition Policy (Decided)

1. Rate-limit persistence remains production-shared:
   - Backend `EARLY_ACCESS_RATE_LIMIT_STORE=postgres` (production default).
   - `memory` is local/test fallback only.
2. OAuth mock fallback remains disabled in production:
   - Backend `EARLY_ACCESS_OAUTH_ALLOW_MOCK_FALLBACK=false`.
3. Community verification policy:
   - Target cutover state: Telegram-based community verification.
   - Bridge state (temporary): Discord route aliases may remain enabled for compatibility while Telegram is the canonical provider.
4. X follow/like verification requirements remain unchanged during migration.

## Telegram Contract (Frozen)

1. Backend evidence model:
   - `communityVerified=true` is canonical only when `early_access_state.telegram_verified_at` is set.
   - `telegram_verified_at` is set only after backend `POST /community/telegram/verify` confirms Telegram community membership via provider check.
2. Endpoint contract:
   - `GET /v1/early-access/community/telegram/connect-url`
   - `GET /v1/early-access/community/telegram/callback`
   - `POST /v1/early-access/community/telegram/verify`
   - Legacy `/community/discord/*` routes remain alias-compatible during transition.
3. Frontend step-2 UX contract:
   - Button copy: `Connect Telegram + Verify`.
   - Verify state is backend-driven only (no optimistic completion from popup open).
   - Retry/failure state is surfaced from backend envelope errors/messages.
4. Event compatibility:
   - `tbo:menu-action` remains `{ action, label }`.
   - `tbo:early-access-claimed` remains `{ walletPublicKey, status, acceptanceId?, guildCode? }`.

## Local Validation Prerequisites

1. Backend is reachable at `http://localhost:4000`.
2. Frontend env uses HTTP mode:
   - PowerShell: `$env:VITE_EARLY_ACCESS_API_MODE='http'`
3. Frontend dev server is running (`npm.cmd run dev`) from `D:\Code\tbowebsite`.

## Quick Backend Smoke (Transition-Safe)

1. `GET http://localhost:4000/healthz` returns 200 with `{ ok: true, data: { status: "ok" } }`.
2. `GET http://localhost:4000/v1/early-access/status` without auth returns `401`.
3. Confirm X connect endpoint exists (non-404):
   - `GET /v1/early-access/social/x/connect-url?returnTo=http://localhost:5173/claim`
4. Community connect endpoint check:
   - Confirm Telegram connect/verify endpoints exist (non-404).
   - Optional bridge check: legacy Discord alias endpoints still return non-404 while alias mode is enabled.

## Flow Validation Matrix

1. `/claim` baseline:
   - Step 1 wallet verifies with backend-issued challenge and signed proof.
   - Step 2 X follow/like badges are backend-driven (no optimistic success).
   - Step 2 community badge is backend-driven for the active provider (bridge Discord or Telegram).
   - Step 3 status and `acceptanceId` remain backend canonical.
2. `/claim?guild=CODE` deep link:
   - Guild join and captain-only controls remain backend-authorized.
   - Refresh status keeps backend canonical guild state.

## Regression Watch

1. No optimistic completion from popup/deeplink open alone.
2. No payload drift for:
   - `tbo:menu-action` -> `{ action, label }`
   - `tbo:early-access-claimed` -> `{ walletPublicKey, status, acceptanceId?, guildCode? }`
3. No console WebGL/Three disposal errors introduced by overlay use.

## Canary Rollout Checklist (Telegram Target)

1. Backend env is production-safe:
   - `EARLY_ACCESS_RATE_LIMIT_STORE=postgres`
   - `EARLY_ACCESS_OAUTH_ALLOW_MOCK_FALLBACK=false`
   - Real X OAuth + target config set
   - Real Telegram integration config set (provider-specific keys/tokens + target community mapping)
2. Frontend env is production-safe:
   - `VITE_EARLY_ACCESS_API_MODE=http`
   - `VITE_EARLY_ACCESS_REQUIRE_TELEGRAM_VERIFICATION=true`
   - Community gating policy points to Telegram implementation (or explicit bridge override if still in temporary Discord mode)
   - API base URL points at production backend origin/path
3. Deploy canary slice and run `/claim` + `/claim?guild=CODE` end-to-end with real accounts.
4. Observe at least one full rate-limit window:
   - Error envelope rates (`4xx`, `5xx`), especially rate-limit, OAuth/provider, and guild authorization failures
   - Audit trail integrity for wallet/social/community/guild outcomes
5. Confirm CI smoke coverage is green for active provider path:
   - Existing authenticated smoke lanes
   - Credential-backed true-positive community lane (Telegram target lane)
6. CI secrets required to enable the Telegram credential-backed true-positive lane:
   - `SMOKE_SOCIAL_X_PROVIDER_USER_ID`
   - `SMOKE_SOCIAL_X_ACCESS_TOKEN`
   - `SMOKE_SOCIAL_X_TARGET_TWEET_ID`
   - `SMOKE_SOCIAL_X_TARGET_USER_ID` (or `SMOKE_SOCIAL_X_TARGET_HANDLE`)
   - `SMOKE_SOCIAL_TELEGRAM_PROVIDER_USER_ID`
   - `SMOKE_SOCIAL_TELEGRAM_ACCESS_TOKEN`
   - `SMOKE_SOCIAL_TELEGRAM_CHAT_ID`
   - Optional: `SMOKE_SOCIAL_X_USERNAME`, `SMOKE_SOCIAL_TELEGRAM_USERNAME`

## Full Cutover Checklist

1. Promote same build artifacts/config used in successful canary.
2. Repeat `/claim` and `/claim?guild=CODE` end-to-end verification at full traffic.
3. Confirm Telegram community requirement is enforced in step-2 gating and backend verify behavior.
4. Remove Discord bridge requirements/config from production policy and CI once Telegram path is stable.
5. Capture post-cutover health notes in `plan.md` and keep this checklist in sync.
