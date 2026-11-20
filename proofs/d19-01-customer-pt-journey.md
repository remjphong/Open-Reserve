# D19-01 — Customer PT core journey and receipt provenance

**Base:** `d1af9e4a60ccb1f4573cad0d27bd8cd0d3617c26` (CTO 2 PR #29 controlled merge plus State Log append).
**Authority:** CTO 2 issue #27 comment 7039780197.
**Scope:** Customer portal and helper/tests only, no ABI/contract/service/research edits, no wallet signing/broadcast by Worker 4.

## User journey

1. `/customer` and `/customer/passes` expose `/customer/passes/1` directly. This avoids presenting a failed provider `getLogs` full scan as no Buyer contracts.
2. With EIP-1193 wallet connected on Fuji, this numeric route invokes existing `readSharedAgreement` for Agreement #1. The shared module verifies deployment/token/resolver/terms and pins monetary `getAgreement` and `getBalances` at one block. No financial fallback to static fixture or Indexer values.
3. Buyer can see deposited, earnedFinalized, gymWithdrawn, withdrawable, refundable, disputedLocked, buyerRefunded, unallocated and remainingLocked separately in **MRES base units (18 decimals)**, not whole tokens/VND. Local I1 checks detect mismatch; no displayed claim that 903 remaining is a refundable entitlement. Buyer refund CTA requires `refundable > 0` and correct wallet role. Existing sign flow still requires the human Buyer to approve each transaction through wallet, and is not exercised in this PR.
4. A historical 4-transaction PT #1 timeline is prominently marked `WALLET1_REPORTED_RECEIPTS_VERIFIED` and links to Snowtrace. Static report is **not** elevated to a new independent RPC proof.
5. A manually triggered **read-only** receipt check fetches actual `getTransactionReceipt`, `getTransaction` and canonical block for each reported hash, checking status, block, Vault destination, from Buyer/Merchant, expected method and Agreement #1 arguments. Only complete 4/4 validation at pinned block shows `RPC_RECEIPTS_MATCHED`. A failed RPC/mismatched role/reorg remains `NOT_VERIFIED`. Even RPC matching does not independently verify gym attendance.
6. Account/chain changes invalidate displayed balance reads; disconnect event now clears stale wallet state. Generic provider failure and unsupported wallet remain clearly visible; no fake verified-empty history.

## Reported PT hashes (Wallet 1 provenance only)

- proposeSession #1: `0x9dcca6c5feda36ef151fa5a7ad5cc9d3e59785432260a2182814989f18eeb01b` (reported block 61373562)
- confirmSession #1: `0xf90b5d3c9e24827600e3102e1afc36ed1b55889f45ce106ffbeb8eab179f106f` (reported block 61374892)
- finalizeClaim #1: `0xd84107f90027f7e90e3c61bdc74dceb9bc018625c8c291ec7a6973b807488ac5` (reported block 61375443)
- claimEarned #1: `0x4b3f87cb99bc297fb8a57779fbc50c6c3e1f32fc7d0a6a5dc71dae5c84392273` (reported block 61376149)
- Historic snapshot reported by Wallet 1 after TX4: `earnedFinalized=100`, `gymWithdrawn=100`, `remainingLocked=903` **base units**. Do not hardcode these as current state.

## Acceptance and exclusions

- CI: TypeScript/build, `node --test apps/web/test/customer-pt-journey.test.mjs`, existing workspace/Foundry/Compose regression. Evidence only becomes PASS on actual exact-head CI.
- Owner WSL `1440x900` and `390x844` rendered Buyer browser/wrong wallet/disconnect/receipt click: **NOT_VERIFIED** until actually captured.
- D18-05 TIME_ACCESS #2 receipt is not part of this handoff; do **not** list it as verified until Wallet 2 supplies a genuine status=1 receipt and CTO accepts provenance.
- Full historical Fuji sync, actual attendance, full three-role E2E, independently verified issuer rights and real commercial custody **NOT_VERIFIED**.
- Workflow owner: CTO 2 decides GO/FIX/HOLD and controlled merge, Worker 4 does not merge.
