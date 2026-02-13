# Early Access HTTP-Mode Verification Checklist

Last updated: 2026-02-13 (PR-12 rollout prep)
Scope: frontend `/claim` and `/claim?guild=CODE` with `VITE_EARLY_ACCESS_API_MODE=http`

## Production Policy (Decided)

1. Rate limit persistence uses a shared store in production:
   - Backend `EARLY_ACCESS_RATE_LIMIT_STORE=postgres` (default in production).
   - `memory` store is local/test fallback only.
2. Discord verification is required in production claim flow:
   - Frontend `VITE_EARLY_ACCESS_REQUIRE_DISCORD_VERIFICATION=true` in production.
   - Backend must provide `DISCORD_GUILD_ID` and Discord OAuth credentials.
3. OAuth mock fallback is disabled in production:
   - Backend `EARLY_ACCESS_OAUTH_ALLOW_MOCK_FALLBACK=false`.

## Prerequisites

1. Backend is running and reachable at `http://localhost:4000`.
2. Frontend env uses HTTP mode:
   - PowerShell: `$env:VITE_EARLY_ACCESS_API_MODE='http'`
3. Frontend dev server is running (`npm.cmd run dev`) from `C:\Users\gazin\tbowebsite`.

## Quick Backend Smoke

1. `GET http://localhost:4000/healthz` returns 200 with `{ ok: true, data: { status: "ok" } }`.
2. `GET http://localhost:4000/v1/early-access/status` without auth returns `401`.
3. Confirm OAuth connect-url endpoints exist (non-404):
   - `GET /v1/early-access/social/x/connect-url?returnTo=http://localhost:5173/claim`
   - `GET /v1/early-access/community/discord/connect-url?returnTo=http://localhost:5173/claim`

## Flow A: `/claim` Baseline

1. Open `http://localhost:5173/claim`.
2. Step 1 Wallet:
   - Click `Connect Wallet`.
   - Click `Sign to Verify`.
   - Expected: wallet badge shows `Verified`.
3. Continue to Step 2 Social.
4. Click `Connect X`.
   - Expected: OAuth popup opens.
   - Expected notice: finish auth in popup, then run follow/like verification.
5. Click `Verify Follow`.
   - Expected: backend response controls badge (no optimistic success).
6. Click `Verify Like Campaign Tweet`.
   - Expected: backend response controls badge (no optimistic success).
7. Click `Connect Discord + Verify`.
   - Expected: OAuth popup opens and verify result is backend-driven.
8. Once follow+like+community are verified, click `Continue`.
9. Step 3:
   - Click `Refresh status`.
   - Expected: acceptance state and `acceptanceId` come from backend status.
   - If accepted: verify key visual/ID section appears and claim event behavior still works.

## Flow B: `/claim?guild=CODE` Deep Link

1. Open `http://localhost:5173/claim?guild=TEST123` (use a valid backend guild code).
2. Complete Step 1 and Step 2.
3. Step 3 behavior:
   - If not in guild: invite card appears with detected code and `Join Guild`.
   - If accepted and no guild: accepted no-guild panel should still allow join via deep link.
4. After join:
   - `guild.code` and member list match backend.
   - Captain-only actions (lock/unlock/kick) enforce backend authorization.
5. Click `Refresh status` and verify backend remains canonical.

## Regression Watch

1. No optimistic completion from popup-open alone.
2. No payload drift for:
   - `tbo:menu-action` -> `{ action, label }`
   - `tbo:early-access-claimed` -> `{ walletPublicKey, status, acceptanceId?, guildCode? }`
3. No console WebGL/Three disposal errors introduced by overlay use.

## Canary Rollout Checklist

1. Backend env is production-safe before traffic:
   - `EARLY_ACCESS_RATE_LIMIT_STORE=postgres`
   - `EARLY_ACCESS_OAUTH_ALLOW_MOCK_FALLBACK=false`
   - Real X OAuth + target config set (`X_OAUTH_CLIENT_ID`, `X_OAUTH_CLIENT_SECRET`, `X_TARGET_USER_ID`/`X_TARGET_HANDLE`, `X_TARGET_TWEET_ID`)
   - Real Discord OAuth + guild config set (`DISCORD_OAUTH_CLIENT_ID`, `DISCORD_OAUTH_CLIENT_SECRET`, `DISCORD_GUILD_ID`)
2. Frontend env is production-safe:
   - `VITE_EARLY_ACCESS_API_MODE=http`
   - `VITE_EARLY_ACCESS_REQUIRE_DISCORD_VERIFICATION=true`
   - API base URL points at production backend origin/path.
3. Deploy canary slice and run Flow A + Flow B end-to-end with real accounts.
4. Observe for at least one full rate-limit window:
   - Error envelope rates (`4xx`, `5xx`), especially `RATE_LIMIT_*`, OAuth errors, and guild authorization failures.
   - Audit trail integrity for wallet/social/guild action outcomes.
5. Confirm authenticated smoke path remains green in CI and post-deploy checks.

## Full Cutover Checklist

1. Promote same build artifacts/config used in successful canary.
2. Repeat Flow A + Flow B verification against production after full traffic shift.
3. Confirm Discord requirement is enforced in step-2 gating and backend verify behavior.
4. Capture post-cutover health notes in `plan.md` and keep this checklist in sync.

