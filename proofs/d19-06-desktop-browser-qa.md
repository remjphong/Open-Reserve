# D19-06 — Owner Chromium 1440×900 browser evidence and bounded P1 repair

**Authority:** CTO 2 [Issue #27 comment 7042379751](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7042379751), Execution Lock Rev 1.2.
**Base:** `7f45cee5ab810281866906a6f4f3730f087b87fa`, compared identical with `unihack-final` before this branch.
**Evidence origin:** Eight real OWNER_UPLOADED_CHROMIUM_SCREENSHOTS in Worker4 ChatGPT conversation on 20 Nov 2026 ICT. Original uploads are **not in GitHub**. This document records filename + checksum; it does **not** represent screenshots as independently witnessed by CTO or as CI screenshots.
**Owner QA checkout and launch (later raw WSL log): VERIFIED_FROM_OWNER_TERMINAL.** Owner created clean Linux worktree `/home/phong/openreserve-d19-06` on `d19-06-desktop-qa` at SHA `7f45cee5ab810281866906a6f4f3730f087b87fa` (accepted `unihack-final`), ran native `npm ci` and `npm run prebuild` PASS, then from that checkout started Vite `127.0.0.1:5174` with public Fuji 43113 Vault/deploy/merchant configuration. `VITE ready / Local: http://127.0.0.1:5174/` reported. **Independent process PID + current working directory after startup:** NOT_MEASURED. **HTTP transport status for each screenshot:** NOT_MEASURED (browser rendered; no separate curl).
**Viewport:** Chrome Device Toolbar set to Responsive **1440×900** in every screenshot; screenshot captures are scaled/cropped within DevTools, not complete below-fold pages.

## Desktop route matrix

| Route | Upload | Pinned block visible | Outcome |
|---|---|---:|---|
| `/customer/passes/1` | `image(20261120-150200).png` | 61383384 | PASS initial render + Fuji Buyer read; Indexer DOWN HTTP 500; claim list unavailable |
| `/customer/passes/2` | `image(20261120-150220).png` | 61383505 | PASS initial render + Buyer Fuji read; Indexer DOWN HTTP 500 |
| `/gym/agreements/1` | `image(20261120-150303).png` | none | BLOCKED: `GYM_READ_FAIL STEP=WALLET_SESSION`, `Ví chưa kết nối`; not a code-bug proof |
| `/gym/agreements/2` | `image(20261120-150321).png` | none | BLOCKED: same missing Merchant wallet connection |
| `/operations/agreements/1` | `image(20261120-150537).png` | 61383586 | PASS initial render, Resolver address/role matched, pinned Fuji Vault ledger |
| `/operations/agreements/2` | `image(20261120-150600).png` | 61383623 | PASS initial render, Resolver address/role matched, pinned Fuji Vault ledger |
| `/operations/disputes/1?claimId=1` | `image(20261120-150620).png` | 61383627 | PASS header + ledger render; direct getClaim outcome BELOW FOLD / NOT_VERIFIED |
| `/operations/disputes/2?claimId=1` | `image(20261120-150637).png` | 61383636 | PASS header + ledger render; direct getClaim outcome BELOW FOLD / NOT_VERIFIED |

**Financial observations, all MRES integer base units (not whole MRES/VND):**

- PT #1 Buyer/Resolver screenshots: `deposited=1003, earnedFinalized=100, gymWithdrawn=100, remainingLocked=903, withdrawable=0, refundable=0, disputedLocked=0`. **903 locked is not 903 refunded or authorized for refund.**
- TIME_ACCESS #2 Buyer/Resolver screenshots: `deposited=900, earnedFinalized=0, gymWithdrawn=0, remainingLocked=900, withdrawable=0, refundable=0, disputedLocked=0`. Historic Wallet2 TX1 deposit report **alone** is not proof of TX2/finalization/withdraw/refund. **Separate later-accepted evidence:** Wallet2 reviewed Owner CAST receipt for TX2 `0x4a24979eb2b8b254d7ccab1169689eea94325148b50dec1332842ff1b1fdb030`, Fuji block 61382886 / status 1; CTO accepted as `TX2_ONCHAIN_RECEIPT_AND_GETCLAIM_PASS_PER_OWNER_CAST_WALLET2_REVIEW` in issue #27 comments 7042956066 and 7043106106. The associated claim was reported PROPOSED (Agreement #2, claim #1, 900 base units). **This screenshot packet itself does not verify TX2 receipt or visible claim state; TX3 finalize, withdrawn income and refund are still not accepted as performed.**
- Customer and Operations show `VAULT_READ_CONTRACT`, Fuji 43113 and accepted Vault `0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad`. Operations prints `ROLE=resolver / RESOLVER_ADDRESS_MATCHED · READ_ONLY`.
- **SAME_BLOCK_MATCHED = NOT_VERIFIED.** Each route snapshot was observed at a different block, and Merchant had no read. Matching-looking amounts at different blocks do not prove same-block financial concordance.
- **Indexer source:** Buyer shows `Indexer: DOWN · Indexer HTTP 500` while read-only pinned Vault balances are rendered, preserving failure separation. Owner Vite terminal confirms repeated proxy `ECONNREFUSED 127.0.0.1:3002`; the local Chain Indexer service was not listening. This is a valid degraded read-only state, not successful local Indexer E2E. Full historical sync is **NOT_VERIFIED**.

## Observed P1: contradictory Operations global notice

Four genuine Operations screenshots simultaneously show a static global banner `DEMO UI — CHƯA KẾT NỐI / Chưa đọc Fuji...` **and** a successful pinned `VAULT_READ_CONTRACT` with `CONNECTED_ACCOUNT` and `ROLE=resolver`. Confirmed cause in `AppShell` is a global unconditional demo warning.

**Bounded fix:** `apps/web/src/design-system/portal.tsx` replaces unconditional disconnected claim with neutral `FUJI READ ONLY — ĐỐI CHIẾU TẠI TỪNG TRANG`. It states amounts appear only after per-page verification and fixture routes are labeled `DEMO_FIXTURE`. Dedicated negative UI-string test `apps/web/test/operations-desktop-qa-notice.test.mjs` is wired to Scaffold CI. **No change to contracts, account/role logic, money, EIP-1193 interactions, backend, SDK, or Fuji chain.** Screenshots are PRE-FIX; fixed view needs new post-merge screenshot.

## Screenshot SHA256 integrity

```text
b842aafae96ace2f399e2bf7295c1b45a39f9e788138b201fe5e954cbbf0ab1b  image(20261120-150200).png
b1e7b0f0d4b50aabe0b31d140aa385a4c48d8d1c2468ebca42a2f0e3b57fb57d  image(20261120-150220).png
0c470e85b6a10fc9cc0d5bcafedae4fc2972a45d152a0826b2fe0141e23d66e4  image(20261120-150303).png
4f6a1a5076cfe66abad9f81499cb3aec1cb4d6efb9c0c63536bf4d426eb8d126  image(20261120-150321).png
b03b76f3bda76aa2c2df00bb5c60886e4a6fd079562394b0b3664f3b92bddefc  image(20261120-150537).png
a34128601cd318f2c59a64d97b0596c1ca79cc8d716e59dbd6ef13979a468831  image(20261120-150600).png
d470bcc5c3af3d8eeaca090f0e794aef9f4c3b1de8dd25aa3436f0329efc3798  image(20261120-150620).png
4db2eb2d9e7ee73152b3d3c4fd2dd2f1a95df19ef264d5076e2940bfe49369df  image(20261120-150637).png
```

## Remaining desktop gates and CTO decision

- Merchant profile wallet-positive read (real correct Merchant address, Fuji 43113) **NOT_RUN**; no claim the screens prove a Gym code failure.
- The two direct `getClaim` responses are **BELOW FOLD / NOT_VERIFIED**, need screenshot after scrolling.
- Wrong chain/account, Core `eth_requestAccounts` rejection, disconnect/reconnect, missing RPC and Indexer DOWN at exact page and account: **NOT_VERIFIED** except observed Buyer Indexer failure. No TX signing or broadcast.
- Owner QA checkout HEAD `7f45cee5ab810281866906a6f4f3730f087b87fa`, startup cwd `/home/phong/openreserve-d19-06`, clean branch and Vite `Local: http://127.0.0.1:5174/`: **CONFIRMED BY RAW OWNER WSL LOG**. Independent running PID/cwd inspection and HTTP statuses per route: **NOT_MEASURED**.
- Browser post-fix Operations notice screenshot, 390×844 D19-07 and three independent deployed hostnames: **NOT_VERIFIED**.
- **CTO request:** review limited P1 code/test/CI and accept partial real-desktop browser packet; do not mark full D19-06 PASS until Merchant/claim/negative and exact-SHA evidence gates are collected. CTO alone may controlled-merge.
