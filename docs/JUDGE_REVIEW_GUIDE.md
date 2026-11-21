# OpenReserve — Judge review guide (D20-FINAL)

> **Read-only evaluator guide · 21/11/2026 · branch `unihack-final`.** Project name **OpenReserve**, Avalanche Team1 VN UniHack. This guide documents what is implemented and what is **not** verified; it is not a production certification. [Evidence index](../proofs/RELEASE_EVIDENCE_INDEX.md) is authoritative for claim provenance.

## 1. First 60 seconds: inspect source, not an imagined live host

1. **Read** [root README](../README.md) for the buyer-vs-gym cash-flow conflict, `PER_SESSION` vs `TIME_ACCESS`, base-unit disclosure and status.
2. **Inspect** [ReserveVault.sol](../contracts/src/ReserveVault.sol), [Foundry tests](../contracts/test), [mock token](../contracts/src/mocks/MockReserveToken.sol) and [SDK](../packages/contracts-sdk). Monetary authorization belongs to the Vault; frontends and Indexer read derived views.
3. **Inspect** [Customer](../apps/web/src/portals/Customer.tsx), [Gym](../apps/web/src/portals/Gym.tsx), [Operations](../apps/web/src/portals/Operations.tsx), [shared Vault reader](../apps/web/src/lib/shared-ledger.ts) and [three services](../services).
4. **Check reproducibility:** [CI run 44848508341](https://github.com/remjphong/Open-Reserve/actions/runs/44848508341) — `workspaces`, `contracts` and `compose` jobs success at PR #37 candidate `d1f865b9cf15ac6343cb4c285ab5e3cf6c9bd780`; [independent source review](https://github.com/remjphong/Open-Reserve/issues/35#issuecomment-7055181219) is **PASS_WITH_LIMITATIONS**, not a security audit.
5. **Check on-chain/release report:** [Wallet2 refund receipts](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7053821341) and [CTO six-screen bounded acceptance](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055805314). Raw latest Owner screenshots are **not uploaded** to repo.

6. **Review the future scope without confusing it with shipped code:** [Cross-industry vision & evidence-gated scaling roadmap](PRODUCT_VISION_AND_SCALE_ROADMAP.md) distinguishes the gym PT10 prototype from boutique ten-class product discovery, uniform nonmedical wellness experiments and policies not built. It explicitly documents the merchant-silent termination limitation, TIME_ACCESS offline-availability evidence gap and provider day-0 cash gap; do not count roadmap items as existing smart-contract capabilities.

> **First-click caveat:** at PR creation the GitHub default branch was `main` with a one-line README. Implemented code lives on `unihack-final`. Worker4 **has not** changed default branch or rewritten `main`; Owner must approve the setting after independent docs review.

## 2. Official evaluation axes → exact evidence (no invented weights)

The [Avalanche Team1 VN UniHack Builder Hub](https://build.avax.network/events/596c0b2d-63aa-4cf0-a0ad-a7e34ddbfdc0) names three qualitative axes, **without a published numeric weighting**:

| Official judging axis | What can be checked | Evidence class / boundaries |
| --- | --- | --- |
| **Value Proposition** | Small prepaid consumer sample: total 21, prior buyers 14, 8 of 14 self-report unused value loss. Gym upfront liquidity conflict: 3 provider-role replies, not 3 proven distinct firms; 2 of 3 favor immediate full receipt in sample. | [Aggregated survey](../research/primary-surveys.md) **OWNER_REPORTED**. [Economics](../research/unit-economics.md) estimates illustrative **−420,000 VNĐ** provider contribution vs an assumed existing model (**MINH_HOA**, not real loss). PMF, gym consent and profitability neutrality **NOT_VERIFIED**. |
| **Technical Complexity** | Solidity Vault with PT two-ended ten-session allocation, TIME_ACCESS time-based earning, disputes/refunds/invariants, SDK; one React/TS frontend with three role portals; Fastify Catalog & Evidence/Chain Indexer/Economics services and separated data roles. | [Vault](../contracts/src/ReserveVault.sol), [tests](../contracts/test), [Architecture](../OPENRESERVE_MICROSERVICES_ARCHITECTURE_2026-11-16.md) **SOURCE_VERIFIED**; [Compose/workspaces/contracts CI](https://github.com/remjphong/Open-Reserve/actions/runs/44848508341) **CI_VERIFIED**. CI Scaffold does **`forge build`**, not `forge test`; Owner-local three backends currently DOWN, full Fuji sync **NOT_VERIFIED**. |
| **Usage of Avalanche Technologies** | Fuji C-Chain ID `43113`, public ReserveVault and mock MRES, claim/payout/refund authority and historical receipts. PT #1: deposit1003 → gym earned/withdrawn100 + buyer refunded903, refundable0; TIME #2: deposit/earned/withdrawn900. | [Fuji provenance](../proofs/d18-02-preflight/stage-b-review.md) and [Vault](../contracts/src/ReserveVault.sol) **SOURCE_VERIFIED**; [Wallet2 refund TX evidence](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7053821341) **OWNER_RPC + WALLET_REVIEWED** with CTO limited acceptance. Not independently fresh RPC audited; not mainnet, real VND or verified gym attendance. |

## 3. Six-screen judged demo: local only, READ-ONLY

**No public hosted demo URL is verified.** These are **Owner-local reference paths**, not a promise that a judge can open another person's `localhost`. Owner previously demonstrated all six **page contents** with screenshots and pasted browser text: [CTO acceptance](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055805314). Continuous timed end-to-end rehearsal and playable recording are **NOT_VERIFIED**.

| Sequence | Core account expected | Path under Owner `http://localhost:5175` | Expected bounded proof |
| --- | --- | --- | --- |
| 1 Buyer | `0x124C7DE92Df945477cAEbdC6745756C4B29e7b7B` | `/customer/passes/1` | PT #1: deposited1003, gymEarned/gymWithdrawn100, buyerRefunded903, `refundable=0` |
| 2 Buyer | same | `/customer/passes/2` | TIME_ACCESS #2: earned/withdrawn900 |
| 3 Merchant | `0xA337FCeC5f9508C3Ab5E10aE571610E167548878` | `/gym/agreements/1` | PT ledger direct Vault read; `VERIFIED_DIRECT_ID_ONLY`, not full log history |
| 4 Merchant | same | `/gym/agreements/2` | TIME ledger900 earned/withdrawn; explicit Indexer limits |
| 5 Resolver | `0x9eded45c48255039861d4d801Eb4287521A98019` | `/operations/disputes/1?claimId=1` | Resolver role matched, PT claim #1 finalized, gym award100, buyer award0 |
| 6 Resolver | same | `/operations/disputes/2?claimId=1` | Resolver role matched, TIME claim #1 finalized, gym award900, buyer award0 |

**Fuji reference:** chain ID `43113`; `ReserveVault` `0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad`; mock `MRES` `0x13562Ac0Ff647Bae830e1179FF1Fc976aBCe66A9`. **All 1003/100/903/900 amounts are integer smallest units of an 18-decimal test token**, so 903 base units = `903 / 10^18 MRES`; **never label as 903 whole MRES or VNĐ**. TIME Fuji configuration is 270 seconds for access and 60 seconds for challenge (not a commercial 90-day promise). [Product & terms](../docs/product-and-terms.md).

**Allowed:** open pages, inspect pinned block/source, select proper Core account, connect account in READ-ONLY mode, and refresh Vault reads. **Never click Approve / Deposit / Confirm / propose / finalize / Claim Refund / “Nhận token được duyệt hoàn” / withdraw / Resolver decision or accept a signature/transaction popup.** Buyer code includes real `wallet.writeContract` paths; no new write transaction is authorized. If `LEDGER_MISMATCH`, wrong chain/account or failed RPC, stop financial presentation; switch only to *clearly dated historical* evidence.

**Degraded truth:** Indexer UI may display proxy HTTP500, whereas current Owner WSL direct service `/health` and `/ready` checks for 3001/3002/3003 all returned **HTTP000**; that is **not** a 500 health response. `/health` process liveness ≠ `/ready` DB/RPC/sync readiness. `INCOMPLETE_LOG_READ` means history could not be fully read, **not** an empty verified history. Catalog evidence hash is a reference, not independent proof that a gym delivered a session.

## 4. Reproduce source checks (independent checkout)

Use a **fresh** checkout of `unihack-final`, Node.js **24**, npm **11** and Foundry. Commands below perform local builds/tests and **no on-chain transactions**:

```bash
git clone https://github.com/remjphong/Open-Reserve.git
cd Open-Reserve
git switch unihack-final
npm ci
npm run typecheck
npm run build
npm test
npm run test:isolation
(cd contracts && forge build)
npm run sdk:check

# Additional OPTIONAL local Foundry tests, not proven executed by CI run 44848508341:
(cd contracts && forge test)

# Targeted buyer accounting + scoped responsive tests:
node --test apps/web/test/customer-pt-journey.test.mjs
node --test apps/web/test/customer-pt-responsive-layout.test.mjs
```

**Important testing order:** `npm run typecheck` invokes SDK prebuild. Run it before directly invoking targeted tests that import `@openreserve/contracts-sdk/dist`. The Owner fresh release checkout reported typecheck/build and targeted 6+2 tests PASS; **this is Owner WSL evidence, not an independent reviewer execution**. [Owner report and controlled cutover](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055627425).

To examine the **single app** locally without starting all backends, set only these **public** Vite environment values (do not put private RPC API tokens/keys in `VITE_*`), then launch on an available local port:

```bash
VITE_VAULT_CHAIN_ID=43113 \
VITE_VAULT_ADDRESS=0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad \
VITE_VAULT_DEPLOYMENT_BLOCK=61240386 \
VITE_MERCHANT_ADDRESS=0xA337FCeC5f9508C3Ab5E10aE571610E167548878 \
npm run dev --workspace @openreserve/web -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173/customer/passes/1` only if your app started. Your Core wallet must provide access to appropriate Fuji account; **opening a local port does not prove you control Owner wallets**. No invitation to sign or broadcast new testnet transactions.

**Optional backend Compose** (only with disposable local credentials and Docker installed) is documented in [existing README](../README.md#docker-compose) and [Compose proof](../proofs/d18-11-compose-integration.md). The CI smoke test without a Fuji RPC intentionally may report Indexer `/health=200`, `/ready=503` — **not** full Fuji historical sync. The [D16-09 service-contracts snapshot](../docs/service-contracts.md) is **historical**, not today's runtime specification.

## 5. Current status and missing Owner deliverables

| Gate | Status as of Owner WSL preflight 21/11/2026 |
| --- | --- |
| Local frontend `:5175`, pinned SHA26bdcc..., six HTTP route transports | **OWNER_REPORTED PASS** (PID4180, HEAD clean, chain config) |
| Fuji public RPC `eth_chainId=43113`, head `61406125` | **OWNER_REPORTED PASS** chain/head liveness; financial getters at this head **NOT_RUN** in that preflight |
| Three Owner local backend services `3001–3003` `/health`, `/ready` | **DOWN HTTP000** |
| Six role-specific screen contents after cutover | **OWNER_CAPTURED / PASS_WITH_LIMITATIONS**, different pinned blocks |
| Wrong wallet/network, reject/disconnect/race; fresh 3-role same-block; physical mobile | **NOT_VERIFIED** |
| Timed continuous rehearsal, playable demo video, slides upload URL, submission receipt | **NOT_VERIFIED** |
| Screenshot ZIP + hash + consent published in repository | **NOT_UPLOADED** |
| Public deployment, licensed/insured fiat custody, signed gym pilot, formal security audit | **NOT_VERIFIED / NOT CLAIMED** |
| Judge default branch landing | **main placeholder until Owner changes default branch after reviewed docs merge** |

**Required Owner materials:** actual pitch slides/link, sanitized and consent-approved screenshots (bytes + SHA256), 60–90s playable export with playback check if making a video claim, and official submission confirmation. The **script** at [Worker 6 click sheet](https://github.com/remjphong/Open-Reserve/issues/36#issuecomment-7054529681) is not a video artifact. Owner alone confirms/changes default branch and submits to [official event](https://build.avax.network/events/596c0b2d-63aa-4cf0-a0ad-a7e34ddbfdc0). CTO decides release GO/HOLD; Worker5 independently reviews this docs PR first.
