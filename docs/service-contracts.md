# OpenReserve service contracts · D16-09

Status: `AWAITING_REVIEW`. Scope: the v1 HTTP boundary and operational probes. The API contract is defined by the strict Zod schemas and derived TypeScript DTOs in [packages/api-contracts](../packages/api-contracts/src/index.ts). Agreement IDs are positive decimal strings scoped to one configured Vault on one chain. uint256 values and block heights travel as decimal strings to preserve precision. Token quantities are smallest units, and chain timestamps are Unix seconds.

| Service | Port | Ownership and authority |
| --- | --- | --- |
| Catalog & Evidence | 3001 | Owns `catalog_db`. Authoritative for catalog descriptions, immutable versions of published metadata and evidence provenance. Vault receipts attest to which hash a claim references. Evidence content alone does not establish delivery or entitle either party to a payment. |
| Chain Indexer | 3002 | Owns `chain_db`. Authorized to read configured Vault events and persist a derived projection. Confirmed Vault state takes precedence, then confirmed receipts, then the indexed projection. |
| Economics | 3003 | Stateless. Inputs are hypothetical and in VND. No database, service-to-service calls or chain dependency. |
| Vault | — | Sole authority for role checks, finalized earnings, locked balances, refunds and transfers. Users sign transactions directly with their wallets. |

## Executable probes

Both routes are local operational reads without a request body. They require no wallet. Health reports only process liveness. Readiness reports the result of probes executed for that request and can change without a restart.

| Method and path | Response schema | Status and dependency behavior |
| --- | --- | --- |
| `GET /health` (all) | `healthSchema` | 200 with service name and `status: "alive"`. Remains 200 during dependency loss. |
| `GET /ready` (Catalog) | `readySchema` | 200 after an authenticated PostgreSQL query verifies `catalog_db` and `catalog_user`. 503 when configuration is missing, the connection/query fails or the role/database is incorrect. |
| `GET /ready` (Indexer) | `readySchema` | Verifies the role and DB for `chain_db`, and the chain ID via `eth_chainId` on the configured RPC. In D16-09 it returns 503 because the sync probe reports `SYNC_NOT_IMPLEMENTED` even when DB/RPC pass. Future readiness requires all checks, including sync, to pass. |
| `GET /ready` (Economics) | `readySchema` | 200 with `dependencies: []`. No remote dependency can degrade this probe. |

Each dependency entry includes `name`, `ok` and a machine-readable `reason`. Reasons are `OK`, `NOT_CONFIGURED`, `UNAVAILABLE`, `WRONG_DATABASE`, `WRONG_CHAIN` or `SYNC_NOT_IMPLEMENTED`. Probe failures omit credentials and upstream errors. RPC and each DB connection/query use a one-second timeout. RPC identity confirms network reachability. Sync, contract deployment and chain freshness are tracked separately.

Docker Compose probes the Chain Indexer at `/health`. A healthy container
indicates process liveness. Clients and operators check `/ready` for
synchronization readiness. In D16-09 the sync check always reports
`SYNC_NOT_IMPLEMENTED`, so `/ready` remains HTTP 503 even with a healthy container.

## v1 routes

All of the following routes return HTTP 501 in D16-09. The body follows `errorSchema` with code `NOT_IMPLEMENTED` or `WRITE_DISABLED`. The table specifies the future successful and expected error responses for each endpoint. Future v1 errors use the same `errorSchema`. HTTP 500 represents an unexpected server error. IDs, cursors and bodies failing their request schemas return 400 `INVALID_REQUEST` once their business handler exists.

| Service / operation | Request → response schemas | Future status, authority and failure behavior |
| --- | --- | --- |
| Catalog · `GET /v1/packages` | No body, path or query params → `packagesResponse` | Public read. 200 with exactly two labeled demo packages: 10 PT sessions and 90-day business access, each carrying the approved version and hash. Catalog uses its own versioned terms and prices. 503 `DEPENDENCY_UNAVAILABLE` when catalog is unavailable. UI preserves known agreements and marks discovery unavailable. |
| Catalog · `GET /v1/agreements/:id/evidence` | `idParams`, `pageQuery` → `evidenceResponse` | Observational read of public demo evidence and safe signed metadata only. 200 may include an empty page; Catalog supplies claim ID, digest, source, description and optional HTTPS URL. 404 only when absence is established, 503 when evidence storage is unavailable. Portals can still display the on-chain evidence hash. No private disclosures, delivery verification or fallback invented records. |
| Catalog · `POST /v1/evidence` | `evidenceRequest` → `evidenceUploadSchema` | Catalog-only write; **501 `WRITE_DISABLED`** through this checkpoint. Future 201 only after wallet signature verification, 400 invalid payload, 401 missing/invalid/expired signature, 403 unauthorized role or chain/domain mismatch, 409 nonce replay, 429 rate limited, 503 DB/RPC unavailable. Fail closed on any unverifiable check. |
| Indexer · `GET /v1/agreements/:id` | `idParams` → `agreementResponse` | Public read of the confirmed indexed projection. 200 includes source and freshness metadata. 404 only when the configured deployment is indexed sufficiently to establish absence. 503 when no usable projection is available. A last consistent projection may be returned as stale, with direct Vault reads required before financial actions. |
| Indexer · `GET /v1/agreements/:id/events` | `idParams`, `pageQuery` → `eventsResponse` | Public read. 200 with confirmed logs indexed from configured Vault, in ascending block/transaction/log order, plus pagination. Each record carries the chain/contract identity, hashes, indices and confirmations; the SDK ABI is used to decode topics/data. Stale 200 for a usable confirmed snapshot, 404 for known missing agreement and 503 if unavailable. Never fabricate history. |
| Indexer · `GET /v1/sync` | No body, path or query params → `syncResponse` | Public read of checkpoint status. 200 when sync is healthy, 503 with the same status DTO and sanitized `lastError` when degraded. Unknown addresses, deployment block, indexed height, tip or lag use `null`, never a placeholder. |
| Economics · `POST /v1/scenarios/compare` | `scenarioRequest` → `scenarioResponse` | Public stateless calculation, no persisted write. 200 labeled `MINH HỌA` with exactly one A/B/C/D result each: incremental gym contribution, cash gap and platform unit margin. Inputs include price, gym variable cost, capital cost and term, CAC, platform operating cost/fee, incremental customers and expected refund rate. 400 invalid input or 503 if the service is temporarily unavailable. UI may display previously validated assumptions with clear labeling. |

Pagination uses an opaque cursor from the same endpoint and agreement, with default limit 50 and maximum 100. An absent next page has `nextCursor: null`. Signed evidence writes must bind the action, domain, chain ID 43113, Vault address, agreement/claim context, payload hash, unique nonce and expiry. The server must recompute the digest, recover the signer, check the on-chain role, and persist the nonce and immutable evidence atomically. Use an origin allowlist and a write rate limit before enabling it. Never accept a wallet's self-declared role. The DTO checks structure only.

An Economics comparison is illustrative. For the architecture's negative example, a 4% fee on 1,500,000 VND yields 60,000 VND, less 70,000 VND CAC and 20,000 VND operating cost, for a platform unit margin of −30,000 VND before fixed costs. The endpoint has no effect on Full Reserve or any Vault behavior.

## PostgreSQL and synchronization

[The initialization script](../infra/postgres-init/01-ownership.sh) sets separate owner roles, removes PUBLIC access on both application databases and restricts both public schemas. The services receive distinct connection strings. Economics receives neither database credential. A failure of the shared PostgreSQL process degrades Catalog and Indexer together, while their processes and Economics stay independent.

Later Catalog tables are `packages`, `terms_versions`, `evidence_records` and `request_nonces` when signed writes are enabled. Chain tables are `chain_events`, `agreement_projection` and `sync_checkpoint`. No cross-service SQL or shared tables. No business tables are created by D16-09.

The indexer must bind the projection and checkpoint to `chainId` and `contractAddress`. Expose `lastIndexedBlock`, `indexedAt` and `isStale` per projection, plus deployment block, chain tip, lag, last error and replay status from sync. Use unique `(chainId, txHash, logIndex)` for logs. Transactionally checkpoint confirmed events by block hash and height, resume from an overlap window, deduplicate and handle reorg replay before clearing stale status. No checkpoint or chain event has been recorded by this task. Stopping the Indexer leaves the Vault intact. Direct chain reads and portal fallbacks are integration scope.

The [contract SDK](../packages/contracts-sdk/src/index.ts) exports ABI metadata generated from the approved Solidity interface, a view-only subset, chain IDs and immutable configuration profiles. Deployment identity has no built-in address.

## Proposed D17-09 amendment — Economics v2

Review status: **AWAITING INDEPENDENT REVIEW**. This proposal changes the D17-09
acceptance target to a functional `POST /v2/scenarios/compare`. The Execution
Lock currently requires a functional v1 compare endpoint, so D17-09 and
D17-GATE still require an explicit acceptance decision. The integration
baseline's v1 DTO and HTTP 501 `NOT_IMPLEMENTED` behavior are preserved.

The conditional research design uses independent A protection and B referral
fees, an A fee split and a C advance. The v1 single `platformFeeRate` cannot
express these parameters. The workbook has no `refundRate` input. The v2
endpoint uses `scenarioRequestV2` → `scenarioResponseV2`. Invalid inputs return
400 `INVALID_REQUEST`. The response echoes the normalized assumptions and has
exactly one scenario of each model. Health/readiness behavior is unchanged.
The endpoint performs no database or RPC operations.

| Fields | Units and behavior |
| --- | --- |
| `label`, `currency` | Required literals `MINH HỌA` and `VND` |
| `price`, `variableGymCost`, `gymProcessingCostPerPackage`, `platformCAC`, `platformVariableCost` | Nonnegative VND per package, bounded by the JavaScript safe integer maximum |
| `protectionFeeRate`, `protectionFeeGymShareRate`, `referralFeeRate`, `advanceRate`, `annualCostOfFunds` | Independent fractions from 0 to 1 inclusive |
| `termDays`, `averageSettlementDelayDays`, `coverageEvaluationDay` | Term is 1–3650 whole days. Settlement delay accepts 0–3650 days, including fractional averages. Coverage day is an integer from 0 through expiry. |
| `incrementalNewCustomers`, optional `incrementalCapacity` | Safe nonnegative integer counts for the same modeled period. Positive counts trigger an attribution warning. Missing or exceeded capacity triggers a separate warning. Warnings do not adjust counts or prove incremental demand. |

For each scenario let `a = advanceRate` for C/D and 0 for A/B. The starting
Vault fraction is `1 - a`. The protection fee is `price × protectionFeeRate`
for A/D and zero otherwise. Gym and OpenReserve split this fee using the gym
share. The referral fee is `price × referralFeeRate` for B/D and zero otherwise.

| Output | Formula and units |
| --- | --- |
| `gymFundingCostPerPackage` | `price × initialVaultProtectionFraction × annualCostOfFunds × averageSettlementDelayDays / 365`, VND per package |
| `gymIncrementalContributionPerPackage` | Price less delivery cost, processing cost, funding cost and referral fee, plus the gym's share of the protection fee, VND per package |
| `platformUnitMarginPerPackage` | Retained protection fee plus referral fee, less CAC and variable cost, VND per package before fixed costs |
| `gymUpfrontCashGap` | `price × initialVaultProtectionFraction`, VND per package at day 0, relative to receiving the entire package price upfront. The comparison excludes fee timing, costs and other cash flows. |
| `initialVaultProtectionFraction` | `1 - a`, unitless fraction |
| `buyerCoverageShortfallAtDay` | `price × max(0, a - coverageEvaluationDay / termDays)`, VND per package for continuous TIME_ACCESS with no additional guarantee. This models coverage exposure and confers no refund entitlement. |
| `coverageEvaluationDay` | Elapsed service days used by the coverage result |
| `gymIncrementalContributionAggregate`, `platformContributionAggregateBeforeFixedCosts` | Respective per-package contribution multiplied by the assumed incremental customer count, VND for that cohort |

Calculations use IEEE-754 double precision with no intermediate or API
rounding. Workbook regression compares values within `1e-8` VND for the
reference case. Products of large amounts and customer counts can lose
integer precision. Display clients may round for presentation. This endpoint
supports illustrative analysis only and remains separate from Vault accounting
and settlement.

Source mapping: the original `OpenReserve_MoHinh_KinhTe_V1_2026-11-16.xlsx`
uses assumptions in `DauVao!B4:B16`, per-model results in
`KhachMoi_4PA!I5:Q8` and coverage in `DongTien_90Ngay!B5:G9`. The sample yields
C/D shortfalls of 450,000 VND at day 0, 283,333.33 VND at day 10 and zero at
day 30 and expiry. A/B maintain Full Reserve in the illustration. The
proposal introduces no on-chain advance or non-Full-Reserve operation.
