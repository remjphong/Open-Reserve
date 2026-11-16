# OPENRESERVE — THREE-PORTAL EXPERIENCE SPEC

**Spec ID:** `OR-UH26-UX-3P`  
**Revision:** `1.1 — 2026-11-16 / MICROSERVICES DATA FLOW`  
**Status:** Approved design proposal, not an implemented product  
**Authority:** Normative design annex to `OPENRESERVE_EXECUTION_LOCK_16-20_NOV_2026.md` revision 1.2; see also `OPENRESERVE_MICROSERVICES_ARCHITECTURE_2026-11-16.md`. If anything conflicts with financial rules, contract-interface or safety rules in Execution Lock, the latter prevails.  
**Scope freeze:** Three first-class portal experiences, not three frontend systems. One React frontend deployment, one contract SDK, one visual design system; backend has three independently deployable microservices (Catalog & Evidence, Chain Indexer, Economics). The user explicitly requested three independent browser entry points; URLs may share one domain.

## 1. THE PRODUCT EXPERIENCE WE ARE BUILDING

OpenReserve is a *prepaid-service protection prototype* built with test tokens on Avalanche Fuji (43113). Its value is not a beautiful dashboard alone, but three parties cooperating over the **same agreement and on-chain token state**:

1. **Customer / Khách hàng:** choose a package, understand its rights, deposit demo tokens into the Vault, track service rights and evidence, approve/challenge fulfillment, receive an authorized refund.
2. **Gym / Nhà cung cấp:** view active packages, submit proof of valid services/time access, track what is pending/finalized, and withdraw only eligible earned tokens.
3. **OpenReserve / Operations:** monitor agreements and funds, inspect evidence and disputes, demonstrate a bounded resolver decision when authorized, explain financial guarantees and platform limits. This portal MUST NOT have a magic withdrawal button.

Product service policies are fixed:
- `PER_SESSION`: earned value per *validated provided session*, not check-in alone.
- `TIME_ACCESS`: earned value per *eligible elapsed access interval*; number of check-ins is irrelevant to earned value.
- `remainingLocked != currentlyRefundable` in general. Demonstrate both numbers with explanations.
- Mock ERC-20 assets held on Fuji have **no VND custody implication**.
- A/B/C/D are research scenarios, never silently enabled in Vault. B may be prioritized for investigation but is not proven viable.

## 2. URLS, SITEMAPS, AND ROLE SEPARATION

A single Vite/React deployment serves three URLs that can be opened independently, bookmarked and demoed concurrently:

**Customer:** `https://<app-domain>/customer`
- `/customer` — Overview / Discover packages.
- `/customer/packages/:packageId` — Package detail: exact entitlement, service type, duration, price, eligibility, contractual limitations, testnet disclaimer.
- `/customer/checkout/:packageId` — Connect Fuji wallet → confirm terms → approve ERC-20 → open agreement/deposit → wait for tx receipt.
- `/customer/passes` — All passes for connected buyer, empty/connecting/error states.
- `/customer/passes/:agreementId` — Rights, fulfillment, vault ledger, claims, timeline, actions relevant to current state.
- `/customer/passes/:agreementId/dispute` — Challenge a time claim or request a documented resolution; authorization clearly shown.

**Gym:** `https://<app-domain>/gym`
- `/gym` — Operational overview: packages, amounts pending/finalized/withdrawable, alerts.
- `/gym/agreements` — Search/filter agreements for gym wallet.
- `/gym/agreements/:agreementId` — Contract terms, service policy, action timeline.
- `/gym/claims/new?agreementId=...` — Propose completed PT session or elapsed TIME_ACCESS interval; never mark it finalized prematurely.
- `/gym/payouts` — Withdraw finalized tokens from Vault with receipt and explorer link.
- `/gym/economics` — Business Lab (A/B/C/D, time-vs-session models, profit, cash gap, platform contribution), always labeled illustrative.
- *Staff presentation mode:* a **clearly labeled read-only demonstration view** of gym operations. Owner/merchant wallet is needed for any write. No invented staff login, role or on-chain permission. Any real staff write permission later needs an explicit security/RFC decision.

**OpenReserve Operations:** `https://<app-domain>/operations`
- `/operations` — System overview: monitored agreements, pending claims, disputes, demonstrable invariant indicators.
- `/operations/agreements` — Agreement explorer, evidence events, role-safe status; each row links to actual Fuji transaction.
- `/operations/agreements/:agreementId` — Agreement ledger: deposited, earned, withdrawn, locked, eligible refunds, parties, terms hash.
- `/operations/disputes` — Queue of disputed claims and resolutions, with exact provenance and mock authority labeling.
- `/operations/disputes/:claimId` — Context/evidence + bounded resolver action ONLY when authorized by the contract and account.
- `/operations/research` — Aggregated survey findings with `n=21 consumer / 3 provider representatives / 1 cooperation response`; private data not exposed.

Do not build a separate landing page, marketing site, user CRM, staff authentication service or merchant marketplace within this sprint. `/` may offer a tasteful simple portal selector if needed, but the three portal URLs are the demo entry points.

**Permission distinctions:** `Customer` = buyer wallet; `Gym` owner = merchant wallet; `Operations` resolver action = demo resolver wallet. Merely entering `/operations` must not grant blockchain rights. Public observational reads may be available; show a non-authorized banner and disable resolver actions when wrong wallet connected. “Operations admin” cannot sweep balances or create refunds without agreement-scoped authorization.

## 3. GLOBAL DESIGN SYSTEM: PROFESSIONAL, HUMAN, QUIET FINTECH

**Art direction:** “Trust through clarity.” Precise but warm, editorial restraint, inspired by good payment-product interfaces and fitness operational software, **not** an over-decorated crypto landing page.

**Consistent brand tokens (design defaults, not legal/brand commitments):**
- Canvas `#F7F8F6`, panels `#FFFFFF`, primary text `#172820`, secondary text `#617269`, borders `#DDE5DE`.
- Primary action `#176B52` with high-contrast white; soft green surface `#EAF4EF`; accent used sparingly.
- Warning `#9A671C`, danger `#B44242`; red/green must never be the sole status indicator.
- Typography: **Be Vietnam Pro** or accessible system fallback for Vietnamese. Use clean numeric tabular columns for money. Avoid tiny text; body around 14–16px, metadata 12–13px with adequate contrast, page headers around 26–32px.
- Spacing rhythm 4/8/12/16/24/32 px, cards radius 10–14px, restrained borders and shadows, generous whitespace.
- Icons: one consistent Lucide family; no random emojis as navigation; real photos only with usage rights and only where they explain the package.

**Layout vocabulary:**
- Customer: friendly purchasing flow, clear featured package and entitlement summary; lightweight top navigation; mobile-first purchase and pass detail.
- Gym: serious operational workspace, left sidebar on desktop, tables/filters and clear claim CTA; mobile navigation with key actions reachable.
- Operations: audit-oriented console, dense but readable ledger and traceability, prominent mock-resolver and testnet context.
- Each portal must be recognizable yet coherent: same token system, different information architecture and editorial emphasis.

**Anti-AI-slop rules:**
1. No giant gradient hero, neon glow, fake metrics, unrelated stock photos, scattered icons, repetitive 3-card grid on every route.
2. No generic marketing filler (“revolutionary”, “seamless”, “game-changing”, “guaranteed protection”).
3. Short, concrete Vietnamese copy. State what happened and what is pending; distinguish “đã yêu cầu”, “đã xác nhận”, “đã chuyển token”.
4. Never use unlabeled placeholder KPI, made-up gym logo or fake review as real business data.
5. Use one consistent component language for tables, buttons, tabs, state badges, monetary data, toasts, confirmations and transaction receipts.
6. Prioritize microcopy, empty states, loading, disabled reasons, and status explanations rather than decorative motion.

## 4. ATOMIC UI COMPONENT LIBRARY (SHARED)

The component contracts should be designed once before portal-specific pages:
- `AppShell`, `RoleNavigation`, `WalletIdentity`, `FujiNetworkBanner`, `PortalRoleBanner`.
- `PageHeader`, `SectionIntro`, `StatusPill`, `EntityTable`, `FilterBar`, `EmptyState`, `ErrorState`, `LoadingSkeleton`.
- `MoneyFigure`, `MoneyBreakdown`, `EntitlementSummary`, `AgreementStatusTimeline`, `AgreementReceipt`, `ExplorerLink`.
- `TransactionAction` with explicit states `idle → sign requested → pending on chain → confirmed | failed`; never show success before receipt.
- `StepFlow` for 3-step wallet approval/deposit; `ConfirmDialog` for irreversible signatures; `EvidencePanel` with `evidenceHash` and demo-fixture label.
- `ScenarioInputs`, `ComparisonTable`, `CashflowChart`/simple week breakdown, `AssumptionsDisclosure` (pure TS economics).

**Contract data boundary:** all on-chain reads/writes in `src/lib/chain` using typed ABI; business calculations on `economics-service` with pure TS shared formulas + schema; catalog/evidence from `catalog-evidence-service`, activity read-model from `chain-indexer-service`. Visual components never recalculate financial authorization based on UI state. On-chain balance is source of truth, not localStorage. Static plan copy and sample evidence live in clearly named `demo/fixtures.ts` and cannot masquerade as chain state.

## 5. DEMO JOURNEY — THREE PORTALS ACTING ON ONE AGREEMENT

**Demo I — purchase and PT payout**
1. Customer opens package details for 10-session PT → reads rights → connects buyer wallet → approves mock token → deposits test token, waiting for Fuji confirmation.
2. Gym portal, connected as merchant, detects agreement ID (refresh/read or polling), opens it and proposes a valid PT session with demo proof hash.
3. Customer portal opens same agreement ID, reviews claim and approves after verifying evidence shown as demo fixture.
4. Gym sees finalized earned amount and calls withdraw. All three portals reconcile the ledger and link to real explorer receipts.

**Demo II — unlimited entitlement**
1. Customer purchases 90-day unlimited test package. Explain that the *business entitlement* is 90 days while *live Fuji demo service interval* is accelerated, never pretend 90 days elapsed on chain.
2. Gym proposes a **past eligible time interval**; its monetary share is time-based. Check-in counts (0 and 15 mock examples) do not alter earned amount.
3. Customer can challenge or allow expiration of clearly displayed challenge window; contract finalizes according to authoritative chain time; gym withdraws eligible tokens.
4. Show special case: gym stops service (demo evidence + mutual/resolver decision), future unserved value is not earned; authorized buyer refund is transferred from Vault.

**Demo III — trust and business viability**
1. Operations opens identical agreement ID and shows actual deposit/withdraw/refund events, remaining tokens and what has/has not been resolved.
2. Operation disputes view clearly states resolver is simulated, access controlled and cannot sweep unrelated money.
3. Gym `/gym/economics` shows A/B/C/D and selected assumptions. Example B=1.5m VND package; 4% referral=60k; CAC 70k + operating 20k => platform *−30k* contribution per true-new customer before fixed costs. No false win-win claim.

For a multi-window live demo, use **three browser profiles** (buyer wallet, gym wallet, resolver wallet). Multiple tabs in the same browser extension profile can unintentionally share/change the connected wallet. Test cross-profile network/chain state before recording video.

## 6. UI STATES ARE PART OF THE PRODUCT, NOT OPTIONAL POLISH

For every transaction route define: no wallet, wrong network, insufficient test AVAX, insufficient mock token, token allowance missing, signature rejected, pending receipt, confirmed receipt, failed receipt, stale RPC, already finalized/replayed action, role mismatch, locked/disputed agreement.

Never:
- show “Thành công” before confirmed receipt;
- imply mock evidence is independently verified;
- make all balances editable or fake-sync them between portals;
- label vault balance as refund entitlement;
- authorize a writer based only on frontend route selection.

**Cross-portal sync:** `chain-indexer-service` reads Fuji events into its own DB and exposes activity/agreements API with `lastIndexedBlock`, confirmations and stale/degraded flag. Frontend uses wagmi/viem **direct chain reads as final authority for money**, transaction receipt refetch, and compares indexer view when displaying history. Provide `Làm mới` control. If indexer unavailable, directly query known agreement IDs; explicitly label history search unavailable rather than invent records. URLs/deep links remain stable across three browser profiles. Catalog evidence and Economics calls never block a valid direct on-chain claim/withdraw. See Architecture annex.

## 7. VISUAL ACCEPTANCE GATES

**D16 UI + service contract freeze**: design tokens and high-fidelity reference frame for each portal (overview, detail, primary action); navigable skeleton for 3 portal URLs; human approves visual direction before implementation proceeds. A plain wireframe alone is NOT acceptance.

**D17 Customer gate**: customer journey (catalog → package terms → checkout → pass) styled using shared components with meaningful states. Only chain-connected actions count as functional.

**D18 Merchant + Operations gate**: gym submit/withdraw and ops audit/resolver routes styled and wired to same agreement; three independent browser profiles tested; `chain-indexer` API sync health visible and activity trace from real chain events.

**D19 cross-portal gate**: a person can understand the cycle end-to-end; Catalog/Evidence, Indexer, Economics each independent health/error states; screenshot consistent typography/spacing; desktop 1440×900 and mobile 390×844; no broken layout or dead CTA on the primary path; wallet errors have explanations; Business Lab uses actual calculations.

**D20 demo gate**: clean browser, three portals, three wallets; all major demo actions have confirmed chain receipts or explicitly labeled prepared evidence. Test video narrative and actual visual clarity. No pixel-polish may justify missing the 20/11 internal submission.

### Human review rubric for each portal (0–2 per item; target ≥ 8/10 each)

- 0–2: clear user goal and navigation; at a glance one sees what role and action.
- 0–2: visual hierarchy and consistent system; no AI-style generic clutter.
- 0–2: correct terminology and transparency of chain/demo/illustrative data.
- 0–2: interaction completeness: loading, error, success, permission handling.
- 0–2: responsiveness/readability on selected desktop/mobile sizes.

**Failure conditions regardless of score:** role can illegitimately transfer tokens; success falsely asserted; fake balances represented as real; portal not independently accessible; same agreement shows conflicting financial state across portals after refresh.

## 8. PLAN B WITHOUT SACRIFICING THE THREE-PORTAL PRODUCT

**Plan A:** rich, coherent three-portal experience, all critical routes above, contract-connected primary actions.

- `B-PORTAL-DEPTH`: when ≥1 portal misses D18/D19 primary-path acceptance, reduce secondary analytics and filters, **never remove one of the three entry points**. Keep essential route chain: Customer packages/checkout/pass; Gym agreements/claim/payout/economics; Operations agreements/dispute/receipts. Secondary pages become well-designed sections with honest navigation and no dead buttons. Human approval required.
- `B-EVIDENCE`: if signed evidence write API is unsafe or blocked, keep Catalog/Evidence microservice **read-only** with pre-seeded demo evidence labeled `TÌNH HUỐNG MÔ PHỎNG`; the **hash, agreement state and payouts remain on chain**. Do not promise verification of real gym uptime.
- `B-INDEX`: when chain-indexer read-model is stale/unavailable, keep service marked degraded; deep-link to known agreement IDs and direct readContract + `Refresh`; document that search/activity is unavailable. No forged ledger rows.
- `B-VISUAL`: if imagery/content polishing blocks test or deadline, keep polished typography, navigation, hierarchy and empty states; reduce decorative assets and animations rather than reverting to raw wireframes.

No Plan B permits replacing real Fuji transfers with fake UI state while claiming a live blockchain demo.

## 9. FILE STRUCTURE — ONE APP, THREE PORTALS

```text
apps/web/src/
  app/                   # providers/router/chain config
  design-system/         # tokens, primitives, layouts, states
  portals/
    customer/            # package, checkout, passes, dispute
    gym/                 # overview, agreements, claim, payouts, economics
    operations/          # audit, disputes, resolution, research
  features/
    agreement/           # shared policy-aware views and types
    transactions/        # wallet + tx status + receipts
    evidence/            # fixtures vs on-chain hashes
    economics/           # pure TS A/B/C/D calculations
  lib/chain/             # one ABI, reads/writes, Fuji config
  demo/fixtures.ts       # explicit labelled research/demo fixtures
```

All three portal pages remain within `apps/web` and the same compiled frontend. Three **backend microservices** live separately under `services/` and expose versioned HTTP APIs; no microfrontend or extra frontend pipeline. Monorepo and one visual system are retained; independent service deployment/testing is required.

## 10. COPY SYSTEM — EXAMPLES

- Customer CTA: **“Mua gói thử nghiệm”**, next line **“Thanh toán bằng token Fuji, không phải VNĐ.”**
- Buyer timeline: **“Gym đã gửi đề nghị ghi nhận 1 buổi PT — chờ bạn xác nhận.”**
- Time entitlement: **“Quyền sử dụng đã cung cấp: 10/90 ngày (theo quy tắc hợp đồng).”** If demo accelerated, show labeled time conversion distinct from real service days.
- Money breakdown: **“Đang được Vault giữ”** vs **“Có thể yêu cầu hoàn sau khi đủ điều kiện”** vs **“Đã được quyết định hoàn”**.
- Gym payout: **“Có thể rút: 100 token thử nghiệm · đã chốt”** (only when chain says so).
- Operations: **“Vai trò phân xử mô phỏng — không xác minh độc lập dịch vụ thực tế.”**
- Business Lab: **“Đây là kết quả theo giả định bạn nhập, chưa phải lợi nhuận của phòng gym đang hoạt động.”**

## 11. EVIDENCE AND STATUS

This file is an accepted **planning revision only**. It does not evidence that designs, routes, screenshots, contracts, deployments or tests already exist. Future AI must report screenshots/commit/test/transaction hashes and stop at `AWAITING_REVIEW` until human acceptance. Visual designs and workflow content may be edited for clarity, but any change to package logic, money allocation, trust boundary or roles requires a Change Request in Execution Lock.
