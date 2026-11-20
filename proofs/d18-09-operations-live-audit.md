# OpenReserve D18-09 — Operations Fuji read-only audit

**Task:** D18-09. **Authority:** CTO 2 issue #27, Execution Lock Rev 1.2.
**Base:** `081c62312df3674426c1f793a2acf25119e5e0c4` (PR #28 research merge included).
**Branch:** `d18-09-operations-live-audit`.
**State:** implementation candidate, **NOT ACCEPTED** until exact-head CI and CTO review.

## Intended P0 behavior

- URL routes `/operations`, `/operations/agreements`, `/operations/disputes` are explicit known-agreement entrypoints, not complete historical discovery.
- Numeric `/operations/agreements/1` and `/operations/disputes/1?claimId=1` load from the same pinned Fuji Vault read and validate deployed token/resolver/runtime and terms through the already-accepted shared ledger helper. Users must connect a wallet on Fuji through an EIP-1193 browser provider; without one the page fails closed and displays no financial fixture.
- All amounts are **integer base units of MRES (18 decimals)**, not whole MRES or VND. `deposited`, `gymWithdrawn`, `buyerRefunded`, `remainingLocked` are checked against I1; `withdrawable`, `refundable`, `disputedLocked`, `unallocated` remain separate.
- Indexer events are advisory; display `FRESH/STALE/DOWN/INVALID_RESPONSE`, pin to lastIndexedBlock, never claim complete history or VERIFIED_EMPTY from an outage. Event links open Snowtrace.
- Claim `getClaim(agreementId,claimId)` uses direct Vault read at the same pinned block. Evidence metadata queried via `/api/catalog` with exact agreement/claim/hash matching, bounded pagination and status `UNAVAILABLE` or `INCOMPLETE` on failure. Evidence hash does **not** verify actual attendance.
- Account or chain changes invalidate the in-flight read and require explicit refresh. **No `writeContract`, signer execution, or transaction broadcast.** Resolver role is informational, and settlement UI stays disabled until Wallet 2/Owner authorization.
- Former `OR-024` and `PT-04` routes remain separately labeled `DEMO_FIXTURE`; no fixture amounts enter numeric Vault pages.

## Evidence gates

- Web TypeScript strict typecheck / production build: CI required.
- Targeted `node --test apps/web/test/operations-routes.test.mjs`: CI required.
- Existing SDK/service/Foundry/Compose regression: CI required.
- Browser 1440x900 and 390x844 with EIP-1193 Fuji resolver wallet, wrong wallet/chain/rejection: **NOT_VERIFIED** until actual Owner/browser proof.
- Catalog-backed evidence availability and Indexer full historical sync on public Fuji: **NOT_VERIFIED**. No synthetic checkpoint, absence or payout claim.
- Four D18-04 PT hashes are Wallet1-reported source evidence only, **not independently re-queried** in this PR.
- CTO 2 retains exclusive ownership of research files from PR #28, none changed in D18-09.

## Owner local WSL

Owner previously reported clean `d18-11-compose-integration` HEAD before CTO merge.
**Do not attempt switching/merging on Owner WSL until fresh read-only status and remote SHA checks.** This PR is authored on a separate remote branch and does not modify Owner's local worktree.

## Remaining

Actual browser role trace, wallet/provider reconnect and UI screenshot verification under Owner's Fuji profile belong to D19 browser QA gates. D18-09 code/CI success alone must not be described as live three-role end-to-end success.
