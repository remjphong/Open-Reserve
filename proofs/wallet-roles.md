# D18-01 — Independent Fuji test wallets

**Status: AWAITING_REVIEW**

**Deployment gate: NO-GO_PENDING_DEPLOYMENT_PREFLIGHT**

Baseline `0f3dadac5bef8814433843b4356af026181eb0b7`. The owner supplied three public addresses. Format, nonzero value and case-insensitive distinctness each passed independent checks.

| Role | Public wallet | Owner-reported browser profile | MetaMask network selection | Signing control |
| --- | --- | --- | --- | --- |
| Buyer | `0x124C7DE92Df945477cAEbdC6745756C4B29e7b7B` | OpenReserve Buyer → Customer | Fuji, owner reported | OWNER_REPORTED_VERIFIED |
| Merchant | `0xA337FCeC5f9508C3Ab5E10aE571610E167548878` | OpenReserve Merchant → Gym | PENDING_VERIFICATION | OWNER_REPORTED_VERIFIED |
| Resolver | `0x9eded45c48255039861d4d801Eb4287521A98019` | OpenReserve Resolver → Operations | PENDING_VERIFICATION | OWNER_REPORTED_VERIFIED |

The owner reports that off-chain `personal_sign` recovery matched the MetaMask account in each profile. The audit did not receive signature evidence. The owner confirmed resolver availability for the demo. The two reported 0.1 AVAX transfers lack independently checked receipts.

## Read-only Fuji snapshot

Avalanche's public Fuji C-Chain RPC returned `eth_chainId = 0xa869` (43113) before and after the checks. Every balance and code query used block **61226438**, hash `0xd32b49704e33a4d5a5371cbb68bd09340e666b7bd615c5644dc4fc6bb8869689`. A second block lookup returned the same hash. Empty `eth_getCode` results establish that the addresses held no deployed code at the observed block. Recheck planned Vault and Token CREATE addresses against the role wallets in D18-02.

| Role | Balance (wei) | Balance (test AVAX) | Code at block |
| --- | ---: | ---: | --- |
| Buyer | 299999999992986000 | 0.299999999992986000 | `0x` |
| Merchant | 100000000000000000 | 0.100000000000000000 | `0x` |
| Resolver | 100000000000000000 | 0.100000000000000000 | `0x` |

Read-only method sequence for reproduction: `eth_chainId`, `eth_blockNumber`, `eth_getBlockByNumber(block, false)`, `eth_getBalance(address, block)` and `eth_getCode(address, block)` per wallet, `eth_gasPrice`, then repeat the fixed block and chain ID queries.

## Gas planning

The RPC gas-price quote during the check was 160 wei/gas. The planning screen uses an assumed 100 gwei/gas cap and the aggregate gas-unit allowances below. These are planning allowances, not transaction estimates or selected fee settings. Actual consumption, fees and repeat actions must be recomputed before signing.

| Role | Planned actions | Gas allowance | Budget at cap | Snapshot result |
| --- | --- | ---: | ---: | --- |
| Buyer | Approvals, PT and TIME opens, PT confirmation, TIME challenge, termination response and refund | 2,000,000 | 0.20 AVAX | Sufficient against planning budget |
| Merchant | PT and TIME proposals, finalization, earned withdrawals and termination | 750,000 | 0.075 AVAX | Sufficient against planning budget |
| Resolver | One bounded dispute decision | 500,000 | 0.05 AVAX | Sufficient against planning budget |
| Deployer | Mock token and Vault CREATEs, demo funding and deployment prerequisites | NOT_VERIFIED | NOT_VERIFIED | No deployer address supplied. Estimate both CREATEs and funding, then verify the deployer's balance separately. If one wallet serves two roles, sum its budgets. |

## Residual testnet risks

- OR-02 · Fixed resolver. Confirm signing access and operator availability immediately before the demo. A resolver outage can stall disputes.
- OR-03 · Claim and termination interlock. Clear live claims before attempting termination and rehearse the active-proposal cancellation path.
- OR-04 · Fuji challenge window is 60 seconds. Leave margin for transaction inclusion and use on-chain timestamps.
- OR-05 · Mock token and wallet operability. Confirm Merchant and Resolver MetaMask network selection and signer identity in their assigned profiles, then refresh balances, estimates and deployer configuration.

D18-02 requires separate authorization. This check used read-only RPC methods and did not submit any transactions.
