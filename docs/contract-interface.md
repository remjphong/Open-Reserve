# ReserveVault ABI v1 · D16-04

Bản chờ nghiệm thu. [Điều khoản v1.0.0](product-and-terms.md) vẫn là bản canonical đã duyệt. Quy tắc PT bên dưới nhắm tới [bản đề xuất v1.0.1](product-and-terms-v1.0.1-proposed.md) và chỉ áp dụng sau khi chủ dự án duyệt đúng bản điều khoản và hash. Khối Solidity dưới đây là khai báo chuẩn để sinh ABI. Cả ba portal và chain-indexer phải dùng cùng artifact sau khi triển khai.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IReserveVault {
    enum Policy { PER_SESSION, TIME_ACCESS }
    enum AgreementState { NONE, OPEN, TERMINATED }
    enum ClaimState { NONE, PROPOSED, CONFIRMED, CHALLENGED, FINALIZED, RESOLVED }
    enum TerminationState { NONE, PROPOSED, DISPUTED, ACCEPTED, RESOLVED, CANCELLED }

    struct Agreement {
        address buyer;
        address merchant;
        Policy policy;
        AgreementState state;
        bytes32 termsHash;
        uint64 startAt;
        uint64 endAt;
        uint64 challengeWindow;
        uint256 challengedSessionClaimId;
        uint8 sessionsFinalized;
        uint8 positiveRefundSlots;
        uint8 sessionsConsumed;
        uint256 liveClaims;
        uint256 deposited;
        uint256 earnedFinalized;
        uint256 gymWithdrawn;
        uint256 refundAuthorized;
        uint256 buyerRefunded;
        uint256 disputedLocked;
    }

    struct Claim {
        ClaimState state;
        bytes32 sessionId;
        bytes32 evidenceHash;
        uint8 settledSessionSlot;
        uint8 reservedGymSlot;
        uint8 reservedRefundSlot;
        uint256 reservedGymAmount;
        uint256 reservedRefundAmount;
        uint64 from;
        uint64 to;
        uint64 proposedAt;
        uint64 challengeEndsAt;
        uint256 amount;
        uint256 awardedToGym;
        uint256 awardedToBuyer;
    }

    struct Termination {
        TerminationState state;
        address proposer;
        uint256 proposedRefund;
        bytes32 evidenceHash;
    }

    event AgreementOpened(
        uint256 indexed agreementId, address indexed buyer, address indexed merchant,
        Policy policy, uint256 amount, bytes32 termsHash,
        uint64 startAt, uint64 endAt, uint64 challengeWindow
    );
    event ClaimProposed(
        uint256 indexed agreementId, uint256 indexed claimId, bytes32 indexed sessionId,
        bytes32 evidenceHash, uint64 from, uint64 to,
        uint64 proposedAt, uint64 challengeEndsAt, uint256 amount
    );
    event SessionConfirmed(uint256 indexed agreementId, uint256 indexed claimId);
    event ClaimChallenged(uint256 indexed agreementId, uint256 indexed claimId, bytes32 evidenceHash);
    event ClaimFinalized(uint256 indexed agreementId, uint256 indexed claimId, uint256 amount);
    event ClaimResolved(
        uint256 indexed agreementId, uint256 indexed claimId, bytes32 indexed sessionId,
        uint256 gymAmount, uint256 buyerAmount, uint8 retiredSessionSlot, bytes32 decisionHash
    );
    event TerminationProposed(
        uint256 indexed agreementId, uint256 indexed proposalId, address indexed proposer,
        uint256 proposedRefund, bytes32 evidenceHash
    );
    event TerminationDisputed(uint256 indexed agreementId, uint256 indexed proposalId, bytes32 evidenceHash);
    event TerminationCancelled(uint256 indexed agreementId, uint256 indexed proposalId);
    event AgreementTerminated(
        uint256 indexed agreementId, uint256 indexed proposalId, address indexed decidedBy,
        bool viaResolver, uint256 refundAmount, bytes32 decisionHash
    );
    event TerminationRefundAuthorized(
        uint256 indexed agreementId, uint256 indexed proposalId, address indexed decidedBy,
        bool viaResolver, uint256 refundAmount, bytes32 decisionHash
    );
    event EarnedClaimed(uint256 indexed agreementId, address indexed merchant, uint256 amount);
    event RefundClaimed(uint256 indexed agreementId, address indexed buyer, uint256 amount);

    error Unauthorized();
    error NotFound();
    error InvalidState();
    error InvalidInput();
    error InvalidInterval();
    error InvalidTermsHash();
    error InvalidTimeProfile();
    error SessionAllocationHeld();
    error DuplicateSession();
    error OverlappingInterval();
    error SessionLimit();
    error ChallengeWindowOpen();
    error ChallengeWindowClosed();
    error LiveClaims();
    error InsufficientUnallocated();
    error NothingToClaim();
    error UnexpectedTokenReceipt();

    function token() external view returns (address);
    function resolver() external view returns (address);
    function timeAccessConfig() external view returns (
        uint64 duration, uint64 challengeWindow, bytes32 termsHash
    );
    function openAgreement(
        address merchant, Policy policy, uint256 amount, bytes32 termsHash,
        uint64 startAt, uint64 endAt, uint64 challengeWindow
    ) external returns (uint256 agreementId);
    function proposeSession(
        uint256 agreementId, bytes32 sessionId, bytes32 evidenceHash
    ) external returns (uint256 claimId);
    function confirmSession(uint256 agreementId, uint256 claimId) external;
    function proposeTime(
        uint256 agreementId, uint64 from, uint64 to, bytes32 evidenceHash
    ) external returns (uint256 claimId);
    function challengeClaim(uint256 agreementId, uint256 claimId, bytes32 evidenceHash) external;
    function finalizeClaim(uint256 agreementId, uint256 claimId) external;
    function resolveClaim(
        uint256 agreementId, uint256 claimId, uint256 gymAmount, uint256 buyerAmount, bytes32 decisionHash
    ) external;
    function proposeTermination(
        uint256 agreementId, uint256 proposedRefund, bytes32 evidenceHash
    ) external returns (uint256 proposalId);
    function disputeTermination(uint256 agreementId, uint256 proposalId, bytes32 evidenceHash) external;
    function cancelTermination(uint256 agreementId, uint256 proposalId) external;
    function acceptTermination(uint256 agreementId, uint256 proposalId) external;
    function resolveTermination(
        uint256 agreementId, uint256 proposalId, uint256 refundAmount, bytes32 decisionHash
    ) external;
    function claimEarned(uint256 agreementId) external returns (uint256 amount);
    function claimRefund(uint256 agreementId) external returns (uint256 amount);
    function getAgreement(uint256 agreementId) external view returns (Agreement memory);
    function getClaim(uint256 agreementId, uint256 claimId) external view returns (Claim memory);
    function getTermination(uint256 agreementId, uint256 proposalId) external view returns (Termination memory);
    function getActiveTerminationId(uint256 agreementId) external view returns (uint256);
    function getBalances(uint256 agreementId) external view returns (
        uint256 remainingLocked, uint256 withdrawable, uint256 refundable,
        uint256 disputedLocked, uint256 unallocated
    );
}
```

## Identity and reads

- Enum ordinals start at zero as listed. IDs are sequential from 1. Agreement IDs are Vault-wide. Claim and termination IDs are per agreement and never reused. Missing entities revert `NotFound`. An existing agreement with no active termination proposal returns 0 from `getActiveTerminationId`.
- Deployment uses `constructor(address token_, address resolver_)` with fixed nonzero addresses. A resolver must be distinct from both parties to an agreement. Buyer and merchant must be nonzero and distinct. The SDK supplies chain ID, token address (from Vault), Vault address and deployment block.
- Indexed event order comes from block, transaction and log index. Events identify records and financial transitions. Portals use reads at a consistent block for current state and re-read directly from Fuji before signing. Use uint-compatible bigint, timestamps in Unix seconds and token amounts in smallest units. ERC-20 `decimals()` is display metadata. No portal computes an authoritative payout or refund.
- `AgreementOpened` is the source of the new ID in a receipt. Claim proposal events carry the new claim ID. A wallet reads a termination proposal and confirms the exact proposal ID and amount before signing acceptance.

## TIME_ACCESS configuration

At deployment, the Vault selects an immutable profile from the deployment chain ID. There are no setters or per-agreement overrides. `timeAccessConfig()` returns the configured values for the wallet and SDK.

| Deployment chain ID | Duration in seconds | Challenge window in seconds |
| --- | ---: | ---: |
| Local Foundry/Anvil (31337) | 7,776,000 | 86,400 |
| Fuji (43113) | 270 | 60 |

Deployment on an unsupported chain ID reverts `InvalidTimeProfile`. Set Foundry's chain ID before deployment when simulating either profile. After deployment the profile remains fixed. The approved v1.0.0 canonical hash remains `0xbcb7bf6578cd0ed96b1a90d80b63ef778c9d38eb55b4e8f17ee36bde7c52201c`. The proposed v1.0.1 hash is `0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8`. The proposed implementation binds both policies to the latter hash at deployment **only after explicit approval of v1.0.1**. Revert `InvalidTermsHash` on mismatch. Never pair this PT behavior with the v1.0.0 hash. The SDK reads the expected hash and profile before opening an agreement. A new terms version or time profile requires a separately approved deployment.

For TIME_ACCESS, require `startAt >= block.timestamp`, `endAt > startAt`, `endAt - startAt == duration` and the supplied `challengeWindow` to equal the immutable configuration, before the token transfer. Revert `InvalidTimeProfile` on mismatch. On claim proposal derive the deadline as `block.timestamp + agreement.challengeWindow` using checked arithmetic. Challenge is legal strictly before that deadline, and unchallenged finalization is legal at or after it. PT requires all three time arguments to be zero.

## Writes and transitions

| Write | Actor and guards | Result and event |
| --- | --- | --- |
| `openAgreement` | Buyer is caller. Nonzero amount and exact canonical terms hash. Enforce the configured policy and timestamps above before touching balances. Buyer approves the ERC-20 before calling. | Transfer from buyer to Vault via SafeERC20. Require exact receipt. Set OPEN and deposit counters. Emit `AgreementOpened`. |
| `proposeSession` | Merchant, OPEN PT agreement, nonzero unique session ID and evidence hash. Session already delivered per terms. Check capacity against consumed slots plus live claims. Reserve one unit of capacity, with the monetary slot assigned later. | PROPOSED. Time fields and `amount` are 0 until allocation. Emit `ClaimProposed`. |
| `confirmSession` | Buyer, PROPOSED or CHALLENGED PT claim. | For PROPOSED, mark CONFIRMED and emit `SessionConfirmed`. For CHALLENGED, record buyer confirmation and atomically finalize the reserved slot for gym, release its hold and emit `SessionConfirmed` then `ClaimFinalized`. |
| `proposeTime` | Merchant, OPEN TIME agreement, nonzero evidence hash. Require `startAt <= from < to <= endAt` and `to <= block.timestamp`. Reject overlap with active or previously decided intervals. Adjacent intervals are allowed. | PROPOSED. Store calculated amount and immutable deadline; emit `ClaimProposed`. |
| `challengeClaim` | Buyer, PROPOSED claim. For TIME, strictly before deadline. Nonzero objection evidence hash. | CHALLENGED. PT permits one active challenge per agreement and snapshots the two alternative slots and their award ceilings. Record the challenged claim ID even when the hold is zero. Emit `ClaimChallenged`. |
| `finalizeClaim` | Either agreement party with a CONFIRMED PT claim or an unchallenged PROPOSED TIME claim at or after deadline. OPEN agreement. Ordinary PT finalization requires no active PT challenge, reverting `SessionAllocationHeld` otherwise. | Mark FINALIZED, record full gym award and increase earned. Emit `ClaimFinalized`. |
| `resolveClaim` | Resolver, OPEN agreement, CHALLENGED claim, nonzero decision hash. Apply the policy-specific award limits below. | Mark RESOLVED, increase `earnedFinalized` and `refundAuthorized` by their respective awards, clear this claim’s hold and decrement live claims once. Emit both awards, original session ID and any retired PT slot in `ClaimResolved`. TIME and zero-award PT use retired slot 0. |
| `proposeTermination` | Either party, OPEN or TERMINATED, no active proposal and no live claims. Evidence hash required. Amount is at most current unallocated. OPEN may propose zero. TERMINATED requires a positive amount. | Create PROPOSED proposal with immutable amount and proposer. While active, block new claims. Emit `TerminationProposed`. |
| `disputeTermination` / `cancelTermination` | Non-proposer party may dispute a PROPOSED proposal with evidence hash. Proposer may cancel while PROPOSED. | DISPUTED or CANCELLED. Cancellation releases active slot. Emit corresponding event. |
| `acceptTermination` / `resolveTermination` | Non-proposer party accepts exact PROPOSED amount. Resolver decides only a DISPUTED proposal with a nonzero decision hash. Both require no live claims and a valid refund budget. | Set proposal ACCEPTED or RESOLVED, clear the active proposal ID and increase authorized refund by the decided amount. First decision closes the agreement and emits `AgreementTerminated`. Subsequent decisions use `TerminationRefundAuthorized`. Both events use zero decision hash for mutual acceptance. |
| `claimEarned` / `claimRefund` | Merchant / buyer of the agreement respectively. Allowed in OPEN or TERMINATED, including during a dispute. Available amount must be positive. | Update counters before transfer. Send entire available amount to the fixed party. Emit `EarnedClaimed` / `RefundClaimed`. |

A live claim is PROPOSED, CONFIRMED or CHALLENGED. Increment `liveClaims` at proposal and decrement it exactly once on finalization or resolution. Both claim proposal methods require no active termination proposal. Filter claim and termination events by agreement ID to enumerate history. Challenge evidence and decision hashes remain available from events.

A claim decision settles the claim once. An unused award budget stays locked and unallocated. A decided TIME interval stays closed for overlap and replay checks, including a zero-award resolution. PT session IDs remain used even after a zero-award decision.

After partial termination, the agreement stays TERMINATED. Either party can propose a supplemental refund of unallocated funds with a fresh proposal ID and evidence. Only the counterparty’s acceptance or a resolver decision on that disputed proposal can authorize the refund. A zero resolver award closes the supplemental proposal without allocating anything. Prior claims and prior proposals cannot be replayed. Existing payable amounts stay available throughout. Residual funds remain locked until a valid supplemental decision, potentially indefinitely if there is no such decision. No supplemental proposal authorizes a gym payout or reopens an agreement.

To allow closure when an active claim is outstanding, the parties first process the claim. Buyer can confirm a delivered PT session or challenge a pending PT proposal. For TIME, buyer may challenge before the deadline. After expiration either party can finalize an unchallenged claim; gym still supplies availability evidence when a claim is disputed. The demo does not infer actual access, pause, closure or delivery from check-ins or block time. A documented interval with interrupted access is handled through scoped resolution. The interface exposes fixed agreement recipients for both payout methods.

## Allocation and exact accounting

Let `P = deposited`. The allocation of a PT slot `n` is `mulDiv(P,n,10) - mulDiv(P,n-1,10)` with floor in both terms. TIME_ACCESS uses `mulDiv(P,to-startAt,endAt-startAt) - mulDiv(P,from-startAt,endAt-startAt)`. Use full-precision integer multiply/divide.

### Resolver awards

For a challenged claim with snapshotted budget `B`, require `gymAmount <= B` and `buyerAmount <= B - gymAmount`. Check the total against unallocated funds **excluding the holds of every other claim**. Resolve atomically, consume the terminal state once, and keep withdrawal and refund as independent calls to fixed wallets. For TIME_ACCESS, confirmed full delivery can award `(B, 0)`; a partially delivered interval can yield a split, with gym share limited to the value of the time actually provided under the terms. The scoped decision and evidence support that assessment. The contract enforces monetary bounds and authority, while the resolver assesses evidence. Example for `B = 300`: `(200, 75)` earns 200, authorizes 75 for buyer and leaves 25 locked. A later resolution cannot assign those 25 as another award for the same interval.

For PT, a resolver-only decision requires `gymAmount = 0` because both terms versions require buyer confirmation before a session can earn. If the resolver finds the PT session valid, gym can receive the slot allocation when the buyer confirms the challenged session on-chain before any terminal resolver decision. A unilateral PT gym award would require a change to the approved terms.

### PT counters and transitions

Let `F = sessionsFinalized`, `R = positiveRefundSlots` and `S(n) = floor(P*n/10) - floor(P*(n-1)/10)`. Gym settles the next head slot `F+1`. A positive refund retires the next tail slot `10-R`. The two indices denote mutually exclusive outcomes when only one slot is available. TIME agreements keep all PT counters, slot fields and the PT challenge pointer at zero.

| PT transition | Slot action | Δ finalized | Δ refund slots | Δ live |
| --- | --- | ---: | ---: | ---: |
| Propose | Reserve capacity. Slot and award fields remain zero. | 0 | 0 | +1 |
| Confirm PROPOSED | Preserve capacity until finalization. | 0 | 0 | 0 |
| Challenge PROPOSED | Snapshot candidate slots `F+1` and `10-R` and their values. Set `challengedSessionClaimId`. | 0 | 0 | 0 |
| Finalize ordinary CONFIRMED | Spend head slot `F+1` and store it as `settledSessionSlot`; require no active challenge. | +1 | 0 | −1 |
| Buyer confirms CHALLENGED | Spend only the reserved head slot, record it and release the dispute hold. | +1 | 0 | −1 |
| Resolver authorizes positive buyer award | Require amount ≤ reserved tail value. Retire the reserved tail slot, record it and release the hold. | 0 | +1 | −1 |
| Resolver decides zero award | Release both reservations. Keep `settledSessionSlot = 0`. | 0 | 0 | −1 |

Maintain `sessionsConsumed = F + R` and `sessionsConsumed + liveClaims <= 10` in every state. A challenge reserves one claim's capacity and holds `max(reservedGymAmount, reservedRefundAmount)` in `amount` and the agreement dispute balance. The terminal paths use their own ceiling and release the full hold exactly once. The pointer blocks a second challenge and ordinary finalization even when the hold is zero. Only the challenged claim can consume a reserved slot. Snapshots are retained for audit. Only `settledSessionSlot` identifies an actually spent slot. A settled zero-value gym award increments `F`; a zero-value tail cannot authorize a positive refund. A zero refund consumes no slot and permanently closes the claim and its session ID.

A positive resolution binds to the immutable agreement ID, claim ID and original PT session ID. It terminates one service entitlement even for a partial amount. A different session ID cannot restore the retired slot. The buyer-facing status must distinguish the authorized refund from the loss of one session entitlement. Show the award and remaining entitlement count `10 - sessionsConsumed` (including sessions with live claims); available capacity for additional proposals is that count minus `liveClaims`. Suggested copy: “Đã duyệt hoàn 40 token. Quyền sử dụng của 1 buổi đã kết thúc.”

The unawarded portion of a retired tail slot remains part of the locked, unallocated balance. Later PT sessions and PT claim refunds cannot draw from that retired slot, because head and tail advance only into unspent slots. The residual can be authorized for buyer only through the termination or supplemental termination-refund process. No automatic payout follows retirement.

Example with `P = 1003`: first approve 40 against tail slot 10 (value 101), then approve 100 against slot 9 (value 100). Gym still earns 100 at its first settled session, from head slot 1. It can settle at most eight sessions for a combined 802. The ledger then has 802 gym earnings, 140 authorized refunds and 61 locked and unallocated. In general, gym allocations occupy `[1,F]`, positive refunds occupy `[11-R,10]` and `F+R<=10` keeps those sets disjoint. Each award is bounded by its slot, so the combined allocation cannot exceed the deposit.

- `remainingLocked = P - gymWithdrawn - buyerRefunded`
- `withdrawable = earnedFinalized - gymWithdrawn`
- `refundable = refundAuthorized - buyerRefunded`
- `unallocated = P - earnedFinalized - refundAuthorized` (includes any dispute hold)
- `disputedLocked` is a subset of `unallocated`. Pending proposals and documented decisions are read separately from payable balances.

TERMINATED closes claim creation. Existing payable balances remain callable. Money-moving methods use reentrancy protection, SafeERC20 and atomic updates. Failure rolls back both token transfer and counters. Only the configured mock token is in scope.

## Invariants and verification targets

| ID | Required invariant and test target |
| --- | --- |
| I1 | For every agreement, deposit = withdrawn + refunded + locked. Check each step, including split awards and supplemental refunds. |
| I2 | Vault token balance ≥ total remaining locked across all agreements. Check multiple agreements. |
| I3 | Withdrawable equals finalized earnings minus withdrawals. Include gym awards on resolved TIME claims. Repeated calls cannot pay extra. |
| I4 | PT session ID cannot replay in its agreement. TIME overlap is rejected, including with active claims. Adjacent half-open intervals pass. Verify reserved-slot serialization even with a zero hold. |
| I5 | TIME earned is independent of check-in count. 0 and 15 check-ins give the same result. |
| I6 | Refund requires a valid scoped decision. Earnings plus authorized refunds ≤ deposit. Reject over-budget split awards, replay of a terminal decision and supplemental refunds above current unallocated. |
| I7 | Wrong actors cannot propose, confirm, resolve or collect. No admin sweep. Resolution authorizes fixed-party balances only. PT gym award requires buyer confirmation. |
| I8 | Dispute in agreement A cannot interfere with agreement B or block already payable amounts. |
| I9 | Test rounding across the ten PT allocations and 90-day TIME partition. Check exact profile durations and windows on both chain IDs, reject altered parameters and hash, and test start/end and deadline equality. |
| I10 | Correct wallet can call both payout methods directly against the Vault when the web is unavailable. |

### PT test targets

| Case | Expected result |
| --- | --- |
| Positive partial refund before first gym settlement | Retire tail slot 10, keep original session ID closed, report one less entitlement. The first gym settlement uses head slot 1. |
| Zero refund | Release hold and claim capacity, keep session ID used, keep both slot counters unchanged. A different valid session can use the released capacity. |
| Multiple positive refunds | Consume tail indices 10, 9, … even with partial awards. Gym count and rounding order stay independent. |
| Zero rounding | With `P = 1`, head slot 1 rounds to 0 and tail slot 10 is 1. Confirming the challenged head still consumes a slot. With `P = 2`, after retiring slot 10, challenge at head 1 / tail 9 holds zero. The pointer still serializes operations and a positive award on tail 9 reverts. |
| Ten slots and double allocation | Reject an eleventh occupied or live slot. With one slot left, both candidate indices may match. Buyer confirmation and resolver settlement are terminal alternatives, so the second action reverts in either order. Check proposal replay by session ID. |
| Conservation | Confirm split-ledger arithmetic after each PT transition, withdrawal and refund. Test the 1,003 example, the remaining 61 across termination, supplemental refund limits and isolation of another agreement. |
