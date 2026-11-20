# D19-03 — Operations / three-portal known Agreement consistency

**Authorization:** CTO 2 [issue #27 comment 7041642174](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7041642174), Execution Lock Rev 1.2.
**Exact base:** `011efafe293a42c372c9e5365fc58a10fd2a9bc3` (`unihack-final` verified identical before branch).
**Branch:** `d19-03-operations-cross-portal`. **Owner WSL:** unchanged (remote worker branch only).

## Scoped implementation

- Operations overview/agreements/disputes now provides direct PT #1 and TIME_ACCESS #2 known IDs. Navigation to the same known ID across Customer, Gym and Operations uses the preexisting 3 independent portal paths and **does not** assert a full `AgreementOpened` scan.
- Operations still calls the existing `readSharedAgreement(session,id)` at one pinned Fuji block, as do Customer and Gym. `auditKnownOperationsSnapshot` verifies chain 43113, accepted Vault address and deployment height, data source `VAULT_READ_CONTRACT`, known Buyer/Merchant, locked terms hash, matching policy and Agreement #2 TX1 time/amount metadata. Money checks: deposited/earnedFinalized/gymWithdrawn/buyerRefunded/refundAuthorized must match pinned agreement fields; I1 and withdrawable/refundable/unallocated getter equations must hold; non-negative and disputedLocked bounds checked. A mismatch **hides amounts and claim/indexed activity panels** and reports `NOT_VERIFIED`.
- Same read helper is the source of code-level consistency, **not evidence that all three role wallets observed the identical live block**. Screenshots and actual Buyer/Merchant/Resolver connected browser evidence are still outstanding D19-06/07.
- Operations displays all distinct integer MRES *base-unit* columns: earnedFinalized, gymWithdrawn, withdrawable, refundAuthorized, refundable, disputedLocked, remainingLocked, unallocated. `903 remainingLocked` does not establish `903 refundable`.
- Agreement #2 reference is limited to **Wallet2-reported accepted TX1 deposit** `0xdb4c9d91f1895c88e719cb1062db8a61cd096c00e5bf75e58b70bf389808ae85`, block 61380299, 900 base units, startAt 1795182500, endAt 1795182770, 60 second challenge. Provenance label: `USER_PROVIDED_CAST_RECEIPT_AND_RPC_STATE + WALLET2_REPORTED_VERIFIED`. This is a historical receipt report and may **not** substitute for current Vault getter values. TX2/proposeTime, finalize, withdraw and refund are **NOT_VERIFIED** until separate actual receipts and CTO acceptance; the changed-candidate TX1 Owner GO mismatch is a separate governance item.
- Direct claim `?claimId=1` is a lookup hypothesis: if absent/reverted/timeout, show `CLAIM_NOT_VERIFIED`, not zero history or a confirmed dispute. Indexer activity remains advisory and can be STALE/DOWN/INCOMPLETE; Catalog hash metadata never independently proves attendance.
- Resolver address is informational only; Operations always leaves its signing/settlement CTA disabled, no EIP1193 wallet write path in D19-03. Account/chain/disconnect invalidates pending read and prevents stale response resurrection. Route-key fence hides old snapshot on navigation before effect reruns.

## Evidence boundaries

- **Exact-head GitHub Actions** must show strict TypeScript/build, targeted `node --test apps/web/test/operations-cross-portal.test.mjs`, previous D18-09, D19-01, D19-02 and workspace/service regression, SDK/Foundry, real Compose startup/DB isolation/selective restart/Indexer outage.
- Targeted tests are **synthetic/read-only functional fixtures** and code assertions, not real wallet or RPC observations.
- **Actual browser/role/viewport** Buyer, Merchant, Resolver at 1440×900 and 390×844: **NOT_VERIFIED** without Owner-provided screenshots/observations. The separate three-portal linkage is not a browser end-to-end PASS.
- **Full Fuji historical indexing**, legal custody, actual attendance, TX2+/D18-06 workflow receipts and production failure recovery: **NOT_VERIFIED**.
- The existing `1 HIGH` npm audit advisory must be investigated with read-only audit JSON at D20, without blind `npm audit fix --force`.
- Source/CI acceptance and controlled merge remain exclusively with CTO 2; no changes to locked ABI/Solidity, services, research docs or append-only State Log. Worker4 does not sign/broadcast Fuji or merge PR.
