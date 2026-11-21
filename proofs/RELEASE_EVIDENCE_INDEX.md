# OpenReserve — Release evidence index (D20-FINAL)

> **Evidence-first index, 21 November 2026.** This is a **pointer to inspectable source and bounded Owner reports**, not a single independent Fuji/on-site audit. **[README](../README.md)** · **[Judge guide](../docs/JUDGE_REVIEW_GUIDE.md)** · **[CTO source-of-truth Issue #38](https://github.com/remjphong/Open-Reserve/issues/38)**. Source changes here are **documentation only**.

## Evidence classes and non-negotiable boundary

| Class | Exact meaning |
| --- | --- |
| **SOURCE_VERIFIED** | Repository file or fixed GitHub commit was inspected; does not establish live deployed behavior. |
| **CI_VERIFIED** | Identified GitHub Actions run/job status was reviewed; proves only that workflow and its specific checks at its specific SHA. |
| **OWNER_REPORTED** / **OWNER_CAPTURED** | Owner WSL/browser/Core/RPC output provided to Worker4; Worker4 reviewed it, but reviewers did not independently operate Owner's system. |
| **WALLET_REVIEWED** | Wallet task/CTO accepted Owner RPC and transaction artifacts with stated limits; not a fresh independent CTO or judge on-chain audit. |
| **MINH_HOA** | Hypothetical scenario used to reason about product/financial tradeoffs, not observed economics. |
| **NOT_VERIFIED** / **NOT_RUN** | Claim lacks enough genuine evidence at indicated layer. **OWNER_CAPTURED_NOT_IN_REPO** marks private original bytes not attached to public GitHub. |

**Units:** All Fuji `1003`, `100`, `903`, `900` refer to **integer base units of 18-decimal mock ERC-20 MRES**. E.g., `903` base units = `903/10^18` MRES, **not 903 whole tokens and not VNĐ**. The purely illustrative VND economics report is separate.

## Current project and code/CI claims

| Claim | Grounded source / immutable point | Exact verdict and boundary |
| --- | --- | --- |
| Product, role separation, PT vs TIME_ACCESS | [Vault contract](../contracts/src/ReserveVault.sol), [v1 terms](../docs/product-and-terms.md), [UX spec](../OPENRESERVE_THREE_PORTAL_UX_SPEC_2026-11-16.md), [frontend portals](../apps/web/src/portals) | **SOURCE_VERIFIED** Solidity PT allocation (10-session, two-ended) and TIME_ACCESS elapsed valid intervals; **one** React+TS app hosts three role portals; NOT three separate publicly hosted websites. |
| Mock MRES/Fuji contract identity | [Deployment review](d18-02-preflight/stage-b-review.md), [SDK deployment source](../packages/contracts-sdk/src/deployment.ts), [mock ERC20](../contracts/src/mocks/MockReserveToken.sol) | **SOURCE_VERIFIED historical deployment record; OWNER_RPC chain evidence reported**. Chain 43113; Vault `0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad`; MRES `0x13562Ac0Ff647Bae830e1179FF1Fc976aBCe66A9`. No independent live CTO RPC replay or mainnet. |
| Protocol testing | [Foundry tests](../contracts/test), [workflow scaffold](../.github/workflows/scaffold.yml), [CI run 44848508341](https://github.com/remjphong/Open-Reserve/actions/runs/44848508341) | **SOURCE_VERIFIED** test files; **CI_VERIFIED** workspaces/contracts/compose jobs **3/3 SUCCESS at PR37 candidate head `d1f865b9cf15ac6343cb4c285ab5e3cf6c9bd780`**. Scaffold builds with `forge build` and checks SDK; **does NOT execute `forge test` in that workflow**. No formal audit. |
| Three Fastify microservices | [Catalog/Evidence](../services/catalog-evidence), [Chain Indexer](../services/chain-indexer), [Economics](../services/economics), [architecture](../OPENRESERVE_MICROSERVICES_ARCHITECTURE_2026-11-16.md), [Compose proof](d18-11-compose-integration.md) | **SOURCE_VERIFIED + CI_VERIFIED** independently executable services, PostgreSQL boundaries, isolated Compose test. **NOT** proof they are running locally on Owner's machine; no public trio of service hosts. |
| UI P1 PT proof layout | [Merged PR #37](https://github.com/remjphong/Open-Reserve/pull/37) candidate `d1f865b9cf15ac6343cb4c285ab5e3cf6c9bd780`, merge `33c8591e4cb85e4903fd25d56cf98700e6332b5a` | **CI_VERIFIED 3/3; OWNER_CAPTURED visual PASS_WITH_LIMITATIONS** desktop proof directly below PT entitlement, mobile390 visual/DOM overflow 390=390 from earlier :5176 evidence. W5 [independent source review](https://github.com/remjphong/Open-Reserve/issues/35#issuecomment-7055181219) PASS_WITH_LIMITATIONS; mobile DOM vs keyboard order P2 remains. |
| Research problem size | [Primary surveys](../research/primary-surveys.md) | **OWNER_REPORTED aggregate**, raw exports not in repo: consumer responses21, past purchasers14, 8/14 self-reported unused-value loss; skip-logic inconsistencies. Provider-role responses3, **not three proven firms**; one cooperation-form reply. Not population rates or automatic refund entitlement. |
| Provider cash-gap and risk | [Unit economics](../research/unit-economics.md) | **MINH_HOA** adverse provider contribution **−420,000 VNĐ** from explicit assumptions; provider-neutrality, real profit data, signed pilot/PMF **NOT_VERIFIED**. |
| Legal/commercial readiness | [Legal scope](../research/legal-scope.md) | **SOURCE_VERIFIED** limitations; insurance, licensed Vietnam fiat custody, real gym service delivery, production security review, approved rollout and PMF **NOT_VERIFIED / NOT CLAIMED**. |

## Avalanche Fuji: transaction chronology and scope

All listed transactions are **historical Owner-provided transaction hashes**, not recreated transactions by Worker4. Link an existing **issue review** rather than claiming each explorer URL was live-checked. [Wallet2 review / 3 refund transactions](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7053821341) · [CTO bounded acceptance](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7053895754).

| Sequence / verified layer | Exact TX hash or source | Block / amount | Provenance and limitations |
| --- | --- | --- | --- |
| PT Agreement #1, gym session/withdrawal, four historical TX | [Wallet1-reported 4-TX chain](https://github.com/remjphong/Open-Reserve/issues/27) and [Customer PT proof helper](../apps/web/src/lib/customer-pt-proof.ts) | PT deposit **1003**, earned/withdrawn **100** base units | **OWNER_REPORTED / WALLET1_REVIEWED**; representative on-chain workflow, **not independently verified physical attendance**. |
| TIME_ACCESS #2 deposit TX1 | `0xdb4c9d91f1895c88e719cb1062db8a61cd096c00e5bf75e58b70bf389808ae85`; [Owner browser report](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055749176) | Block **61380299**; deposit **900** base units | **OWNER_REPORTED / WALLET2_REVIEWED** historical deposit receipt; **this transaction alone does not prove** finalized income/withdrawal. Fuji demo 270s duration / 60s challenge. |
| Refund TX1 — Buyer proposeTermination | `0x9af4e6884900c97234b2cc583f34ed02add58fbe69e9c260ba425d40313e965b` | Block **61387585** | **OWNER_RPC / WALLET2_REVIEWED**; a proposal, **not** an automatic refund for missed sessions. |
| Refund TX2 — Merchant acceptTermination | `0xeb65d83fb2dfd5ea6535c7dd6c39bd26b1d2692b043324d3a8ccd9fba2ae220e` | Block **61389180**; refund **authorized 903** | **OWNER_RPC / WALLET2_REVIEWED** authorization. `refundAuthorized` is not yet `buyerRefunded`. |
| Refund TX3 — Buyer claimRefund | `0xc378c67bd40cb1795dda3b4049c78d7ff0ce3645a3bef2c90c6878f342cc6b3c` | Block **61401275**; Buyer actually receives **903** | **OWNER_RPC / WALLET2_REVIEWED**. Post-TX3: `buyerRefunded=903`, `refundable=0`, remainingLocked0; prior screenshot showing refundable903 was **PRE-REFUND HISTORICAL**. |
| PT #1 resolved claim / TIME #2 resolved claim | [CTO bounded six-screen report](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055805314) | Claim #1 PT **100 → gym100/buyer0**; TIME **900 → gym900/buyer0** | **OWNER_COPIED_BROWSER_TEXT**, role label `ROLE=resolver/READ_ONLY` and claim state 4 reported in actual Operations UI; **not** an independently new RPC contract transaction receipt. |

### Reported on-chain accounting after the refund

| Agreement and as-of evidence | deposited | earnedFinalized | gymWithdrawn | buyerRefunded | refundable | remainingLocked | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| **PT #1** | 1003 | 100 | 100 | **903** | **0** | 0 | [Owner post-TX3 and 6-screen summary](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055805314); **OWNER_REPORTED**, screenshots/clipboard, not independent live UTC RPC |
| **TIME_ACCESS #2** | 900 | 900 | 900 | 0 | 0 | 0 | [Owner six-screen](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055805314); **OWNER_REPORTED** |

These equations must not be converted to VND/whole MRES. The direct Vault getter at the displayed pinned block is the monetary source when a browser read **actually succeeds**; historical receipts are separately dated. The UI's `SHARED_VAULT_IDENTITY_AND_GETTERS_MATCHED` **does not prove all three roles were evaluated at the same block**.

## Owner live local demo evidence: exact released SHA / observed blocks

**Source checkout** after controlled Owner approved cutover: `26bdcc45715830553b78e3fb6fc3707c9a8bd8da`, root `/home/phong/openreserve-d20-local-release`, app port `:5175`; [Owner terminal, Worker4 review and CTO acceptance](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055805314). GitHub later State Log commits do **not** imply the local Vite source was changed.

| Actual Owner page evidence | Role | Reported Fuji block | Reported result | Raw public asset? |
| --- | --- | ---: | --- | --- |
| `/customer/passes/1` | Buyer | **61405001** | Corrected PT layout / Vault financial fields incl buyerRefunded903 | **OWNER_CAPTURED_NOT_IN_REPO** (Chrome screenshot shared with Worker4) |
| `/customer/passes/2` | Buyer | **61405007** | TIME deposits/earned/withdrawn900 | **OWNER_CAPTURED_NOT_IN_REPO** (Owner screenshot and later pasted content) |
| `/gym/agreements/1` | Merchant | **61405008** | `VERIFIED_DIRECT_ID_ONLY`, PT ledger conservation | **OWNER_CAPTURED_NOT_IN_REPO** (Owner screenshots) |
| `/gym/agreements/2` | Merchant | **61405008** | TIME ledger900, Indexer DOWN | **OWNER_COPIED_BROWSER_TEXT**, no raw screenshot publicly attached |
| `/operations/disputes/1?claimId=1` | Resolver | **61405349** | PT claim #1 finalized / gym100 / buyer0 | **OWNER_COPIED_BROWSER_TEXT**, not a new Wallet2 receipt |
| `/operations/disputes/2?claimId=1` | Resolver | **61405352** | TIME claim #1 finalized / gym900 / buyer0 | **OWNER_COPIED_BROWSER_TEXT**, not a new Wallet2 receipt |

**Status:** `SIX_SCREEN_CONTENT=OWNER_REPORTED_PASS_WITH_LIMITATIONS` from [CTO acceptance](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055805314), **NOT** a proven uninterrupted timed demonstration and **NOT** same-block three-role parity. Historical [D19-06 desktop browser QA proof](d19-06-desktop-browser-qa.md) is **pre-refund**; do **not** cite it to imply current Buyer received903.

### Pre-demo WSL check (Owner pasted output, 21 Nov 2026)

[Exact Owner terminal preflight reported by Worker4](https://github.com/remjphong/Open-Reserve/issues/38#issuecomment-7056121170):

| Check | Actual read-only output | Scope |
| --- | --- | --- |
| Live frontend | `:5175` PID **4180**, CWD `/home/phong/openreserve-d20-local-release/apps/web`, clean source SHA `26bdcc45715830553b78e3fb6fc3707c9a8bd8da` | **PASS OWNER_TERMINAL** |
| Public Fuji env | chain **43113**, Vault `0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad`, deployment block `61240386` | **PASS OWNER_TERMINAL** |
| Six judged paths | six `curl` HTTP **200** | **PASS TRANSPORT ONLY** |
| Fuji RPC | `cast chain-id` **43113**, `cast block-number` **61406125** | **PASS CHAIN/HEAD LIVENESS ONLY**; fresh agreement getters at that block **NOT_RUN** |
| Catalog :3001 | `/health=000`, `/ready=000` | **DOWN** (connection failed; **not** service returning HTTP500) |
| Indexer :3002 | `/health=000`, `/ready=000` | **DOWN**; UI proxy may separately show `Indexer HTTP500` |
| Economics :3003 | `/health=000`, `/ready=000` | **DOWN** |
| Backup :5176/:5177 | no listener lines in this new output | **NOT LISTENING AT SNAPSHOT**, no action taken |
| Fresh Buyer/Merchant/Resolver Core/claim role at current RPC block | not in shell preflight | **NOT_RUN**; previous Owner 6-screen content reported at other blocks |

**Do not infer** a hidden runtime service from GitHub Compose CI. HTTP000 local /health and /ready mean no HTTP response, not passing or failing readiness semantics from a live server.

## Not-public artifacts and submission obligations

| Artifact | Public state as of this index |
| --- | --- |
| Post-TX3 latest Owner Chrome screenshots / 390px UI / six-screen originals | **OWNER_CAPTURED_NOT_IN_REPO**. Some hashes appear in [Worker4 report](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055040103), but hashes/reports are **not PNG bytes**. Do not embed or silently link images from private chat. |
| Historical mobile screenshot ZIP `openreserve_d19_07_mobile_all_8routes_36screens_evidence.zip` | **OWNER_CAPTURED_NOT_IN_REPO**; previously reported SHA256 `19272fe9c3257e88947d673ce973e6bbbe72a2bcaffe067008dd756be41c8ba0`. Private historical ZIP **not independently downloaded from GitHub**. |
| Raw WSL / RPC logs for three refund TX | **OWNER_REPORTED** through Issue/Wallet review; not all raw original evidence included in release index. |
| Public sanitized screenshots | **NOT_UPLOADED**; require original bytes, privacy inspection, checksum and explicit Owner consent before publishing. |
| Timed continuous six-screen Core role-switched rehearsal | **NOT_VERIFIED**; previously six separate route content checks. |
| Playable local demo video / recording export and playback | **NOT_VERIFIED**; [W6 storyboard/voiceover](https://github.com/remjphong/Open-Reserve/issues/36#issuecomment-7054404022) is **SCRIPT ONLY**. |
| Pitch slides file or accessible URL | **NOT_VERIFIED**. |
| Full local 3-services readiness and Fuji historical Indexer sync | **NOT_VERIFIED / currently local services DOWN** (see actual preflight). |
| Full wrong-wallet/chain, rejected permission, disconnect/reconnect, stale event negative runtime QA; physical-device mobile accessibility | **NOT_RUN**; source-level mobile keyboard vs CSS order P2 [W5 review](https://github.com/remjphong/Open-Reserve/issues/35#issuecomment-7055181219). |
| Regulatory VND escrow, insurer, signed gym pilot, market fit, provider economic neutrality, formal security audit | **NOT_VERIFIED / NOT CLAIMED**. |
| Owner submission on [Avalanche Team1 VN UniHack official Builder Hub](https://build.avax.network/events/596c0b2d-63aa-4cf0-a0ad-a7e34ddbfdc0) | **SUBMISSION_RECEIPT=NOT_VERIFIED**; Owner alone submits repo/slides/supporting files. Official close per Builder Hub **2026-11-25 05:59 UTC+7**, team internal **2026-11-21 15:00**. |
| Judge landing on repository root | **HOLD** until docs merged and Owner explicitly chooses a default-branch strategy. At audit `main` held one-line README while `unihack-final` held implementation; do not silently force/reset main. |

**Safety:** Do not commit or expose private keys, seed phrases, private .env, respondent identity, personal data, or unapproved screenshot metadata. Public wallet addresses and transaction hashes are not signing credentials, but cannot prove owner control. Do not infer a LICENSE or SECURITY policy when neither has been approved. W5 reviews added text/links/secrets before any CTO controlled merge.
