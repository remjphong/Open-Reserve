# D19-02 — Gym known PT #1 and TIME_ACCESS #2, direct Fuji ledger

**Task:** D19-02 from CTO 2, [issue #27 comment 7041143988](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7041143988).
**Base:** `a50601dec7a2106a8d9c21e3b63df9f60a484657` on `unihack-final`, verified identical at feature branch creation.
**Branch:** `d19-02-gym-known-agreements`.
**Authority:** Execution Lock Rev 1.2. CTO 2 performs controlled merge; Worker 4 never signs/broadcasts Fuji.

## Intended Gym journey

1. Visit `/gym`, `/gym/agreements/1` (PT) or `/gym/agreements/2` (TIME_ACCESS) directly, independent of large merchant-wide `AgreementOpened` scans. Merchant EIP-1193 wallet must be on Fuji, with account matching agreement merchant and validated deployed Vault/token/resolver/runtime. Without wallet/config, display NOT_VERIFIED; never show fixture balances.
2. `readDirectGymAgreement` reuses `readSharedAgreement` at one pinned Fuji block. **All monetary values come from getters at that block**, not static history or Indexer.
3. Ledger shows deposited, earnedFinalized, gymWithdrawn, withdrawable, buyerRefunded, refundAuthorized, refundable, disputedLocked, remainingLocked and unallocated **in integer base units of MRES (18 decimals)**. Conservation and derived getter checks reject inconsistent monetary states: show VAULT_LEDGER_MISMATCH and do not simulate payout.
4. PT #1: Wallet 1 reported four successful PT tx receipts (propose, confirm, finalize, withdraw). The existing D19-01 source `wallet1PtReport` is reused. Historic snapshot was 1003 deposited, 100 earned, 100 withdrawn, 903 locked. This snapshot is **only compared to**, never substituted for, the *current* Vault read. A later changed state is not itself an error.
5. TIME_ACCESS #2: Wallet 2 reported a real `openAgreement` TX1 status=1 from Owner-provided `cast receipt`, decoded `AgreementOpened` #2, and `getBalances` at block 61380299:
   - TX hash `0xdb4c9d91f1895c88e719cb1062db8a61cd096c00e5bf75e58b70bf389808ae85`
   - reported deposit 900 base units, startAt 1795182500, endAt 1795182770, challenge 60.
   - provenance **USER_PROVIDED_CAST_RECEIPT_AND_RPC_STATE + WALLET2_REPORTED_VERIFIED**; not a fresh Worker4 RPC check.
   - **No subsequent TIME_ACCESS finalize, earned, withdrawal, authorized refund or payout receipt has been provided for this branch**. Current getters, if they change later, are not rewritten from this historical snapshot; no wallet write is initiated here.
6. Pending/confirmed/finalized/withdrawn are distinct. `disputedLocked` is not withdrawable. `remainingLocked=903` is not `refundable=903`. `INDEXER_ACTIVITY` is advisory and its failure cannot prove VERIFIED_EMPTY.
7. Existing `GYM_CHAIN_WRITES_ENABLED=false`, simulated-only controls and event fencing stay unchanged. The narrow Gym reconnect-list P2 has not been modified without a fresh reproducer; no risky unrelated refactor.

## Evidence and gates

- Exact-head CI: TypeScript, Vite build, `node --test apps/web/test/gym-known-evidence.test.mjs`, existing Gym/WALLET/Operations/Customer tests, SDK/Foundry, Compose isolated restart.
- Browser merchant 1440x900 and 390x844, browser provider wrong account/chain/disconnect/reconnect, actual Fuji read result: **NOT_VERIFIED until Owner supplies screenshots and observed field values**.
- Wallet2 future TX2+ and D18-06 refund: separate wallet lane, no automatic proof from TX1.
- Full Fuji historical catch-up / production disaster recovery / signed merchant transactions from web: **NOT_VERIFIED**.
- Existing HIGH npm audit advisory: D20 targeted read-only `npm audit --json` triage still required.

Never claim this PR proves authenticated merchant-wide completeness or Owner live visual E2E. Do not modify local Owner WSL until a fresh read-only shell/branch/status check. Only CTO 2 can controlled-merge.
