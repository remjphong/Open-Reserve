# OpenReserve — Unit economics & provider cash gap (D19-04)

**Status:** MODEL / ILLUSTRATION, **not** actual gym profitability or validated pricing.
**Source:** Execution Lock Rev 1.2 + CTO succession business constraints. No raw gym cost accounting or merchant agreement is present here.

## Two different policies; one accounting truth

- **PER_SESSION / PT:** ten session slots. The frozen contract allocates the n-th merchant entitlement with `F(n)-F(n-1)`, `F(n)=floor(P*n/10)`; positive authorized refund allocations may consume rights from the opposite end. `P` is an ERC-20 integer **base-unit** amount on Fuji, not a VND payment. A merchant session proposal alone does not mean finalized or withdrawn earnings.
- **TIME_ACCESS:** unlimited service access for a fixed duration, with entitlement earned based on elapsed interval, **not** attendance count. Fuji demonstration is 270s / 60s challenge; real-world examples below use hypothetical 30-day access solely for business illustration.
- **Money distinction:** `deposited`, `earnedFinalized`, `gymWithdrawn`, `refundAuthorized`, `buyerRefunded`, `disputedLocked`, and `unallocated` are distinct concepts. Never infer authorized refunds from an unused schedule.
- **What escrow changes:** merchant may lose immediate access to customer prepayments, even when gross eventual revenue might be similar. Analyze **liquidity** and **contribution** separately.

## Definitions for a provider comparison

`P` = customer package price; `A` = number of attended sessions; `c` = incremental provider cost per attendance; `o` = extra provider operating expense caused by the model; `E` = actual gym payout earned/withdrawn under valid contract terms; `r` = contract-authorized buyer refund; `f` = separate buyer protection fee, if any.

- Current prepaid illustrative contribution before fixed overhead: `P - A*c` (assumes provider retains entire prepaid value under lawful existing terms).
- OpenReserve illustrative realized contribution: `E - A*c - o + provider-side support` (exclude unearned locked sums and **do not** count them as provider income).
- Difference: `E - P - o + support` for identical attendance/costs, before retention, acquisition, tax and financing differences.
- Week-`t` cash gap: `current-model cumulative gym receipts - OpenReserve cumulative gym withdrawals`; record timing of costs and working capital separately.

## Negative PT scenario — explicit hypothetical assumptions only

**[MINH HỌA]** Assume a VND-priced local gym package `P=1,000,000 VND`, ten classes, six attendance sessions, `c=50,000 VND/session`, and `o=20,000 VND`. Assume the gym's existing lawful terms retain all prepaid consideration. In the **hypothetical** OpenReserve alternative, six sessions are earned and the remaining four are **validly authorized** for refund under agreed terms. This is **not** a claim that nonattendance automatically creates refunds.

| Variable | Existing prepaid model | Hypothetical protected model |
|---|---:|---:|
| Customer paid (VNĐ example) | 1,000,000 | 1,000,000 |
| Six attended sessions, variable cost | 300,000 | 300,000 |
| Realized provider receipts after permitted settlement | 1,000,000 | 600,000 |
| Additional provider operating cost | 0 | 20,000 |
| Provider contribution before fixed overhead | **700,000** | **280,000** |
| Difference vs existing | — | **-420,000** |
| Residual 4/10 authorized buyer refund | None under assumed old terms | 400,000 |

**Result:** under these illustrative assumptions, provider economic neutrality **fails** by 420,000 VND. This is a deliberately negative scenario to test feasibility, not a measured gym loss. Contract payout allocations in the live Fuji demo are token **base units** and must not be mislabeled as VND.

### Illustrative cumulative liquidity gap (no external subsidy)

| Period | Current gym cumulative receipts | Protected gym cumulative withdrawals | Cash gap |
|---|---:|---:|---:|
| Day 0 | 1,000,000 | 0 | 1,000,000 |
| Week 1, two finalized/withdrawn sessions | 1,000,000 | 200,000 | 800,000 |
| Week 2, four sessions total | 1,000,000 | 400,000 | 600,000 |
| Week 3, six sessions total | 1,000,000 | 600,000 | 400,000 |

Assumes zero chain/settlement lag after finalization and equal cash collection under the existing model. Actual challenge, dispute, financing and timing may worsen the interim gap. This is not a real observed weekly cashflow ledger.

## TIME_ACCESS illustration — different from ten visits

**[MINH HỌA]** Hypothetical 30-day unlimited pass with 1,000,000 VND nominal prepaid price (off-chain study only); elapsed-time allocation as `floor(P * elapsedDays/30)`. At day 7: 233,333 VND nominal earned; day 14: 466,666; day 30: 1,000,000. This schedule is a conceptual analogy; it is **not** a live production VND contract and must not be mixed with Fuji's 270s demo. Provider marginal expense still depends on actual attendance, available equipment/class capacity and peak-time opportunity cost, and must be independently estimated.

## OpenReserve-side variable contribution

**[MINH HỌA]** If the buyer's incremental fee is `30,000 VND` and variable payment/support/service expense per package is `40,000 VND`, then unit contribution is **-10,000 VND** before fixed costs, losses, chargebacks, disputes and legal overhead. No demand survey validates the fee. Adding more customers would scale the loss unless costs or unit revenue change.

## Cooperation scenarios A/B/C/D — evaluation discipline

The historic survey uses option codes A/B/C/D, but the single A/B/C/D response cannot establish a preferred or validated agreement. Do not invent option definitions, signed contract terms, subsidy rates, or a universally safe choice. For **each** candidate cooperation option, collect the gym's actual `P`, expected use, incremental variable cost, peak capacity, refund grounds, fees, finance rate, retention/acquisition effect and operational burden. Calculate weekly cash gap and provider contribution delta, and include at least one negative case.

**Provider-neutrality gate:** no option is accepted unless the provider's profit and working-capital impact can be estimated with real inputs and explicit tradeoffs. The current prototype demonstrates correct bounded on-chain allocation logic, **not** merchant profitability, commercial fit, or compliance in Vietnam.
