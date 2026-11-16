# ReserveVault ABI v1 · D16-04

Bản chờ nghiệm thu. Dựa trên [điều khoản demo v1.0.0](product-and-terms.md). Khối Solidity dưới đây là khai báo chuẩn để sinh ABI. Cả ba portal và chain-indexer phải dùng cùng artifact sau khi triển khai.

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
        uint8 sessionsFinalized;
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
        uint256 indexed agreementId, uint256 indexed claimId, uint256 buyerAmount,
        bytes32 decisionHash
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
    event EarnedClaimed(uint256 indexed agreementId, address indexed merchant, uint256 amount);
    event RefundClaimed(uint256 indexed agreementId, address indexed buyer, uint256 amount);

    error Unauthorized();
    error NotFound();
    error InvalidState();
    error InvalidInput();
    error InvalidInterval();
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
        uint256 agreementId, uint256 claimId, uint256 buyerAmount, bytes32 decisionHash
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

## Writes and transitions

| Write | Actor and guards | Result and event |
| --- | --- | --- |
| `openAgreement` | Buyer is caller. Nonzero amount and terms hash. PT uses zero for the three time fields. TIME uses a future or current start, end after start and nonzero challenge window, matching the accepted 90d/24h or Fuji 270s/60s configuration. Buyer approves the ERC-20 before calling. | Transfer from buyer to Vault via SafeERC20. Require exact receipt. Set OPEN and deposit counters. Emit `AgreementOpened`. |
| `proposeSession` | Merchant, OPEN PT agreement, nonzero unique session ID and evidence hash. Session already delivered per terms. Reserve an available session slot within the ten-session cap. | PROPOSED. Time fields and `amount` are 0 until allocation. Emit `ClaimProposed`. |
| `confirmSession` | Buyer, PROPOSED PT claim. | CONFIRMED and emit `SessionConfirmed`. |
| `proposeTime` | Merchant, OPEN TIME agreement, nonzero evidence hash. Require `startAt <= from < to <= endAt` and `to <= block.timestamp`. Reject overlap with active or previously decided intervals. Adjacent intervals are allowed. | PROPOSED. Store calculated amount and immutable deadline; emit `ClaimProposed`. |
| `challengeClaim` | Buyer, PROPOSED claim. For TIME, strictly before deadline. Nonzero objection evidence hash. | CHALLENGED. PT permits one active challenge per agreement. It reserves the next claim allocation slot and blocks further PT settlement until resolved, see below. Emit `ClaimChallenged`. |
| `finalizeClaim` | Either agreement party with a CONFIRMED PT claim or an unchallenged PROPOSED TIME claim at or after deadline. OPEN agreement. | Mark FINALIZED, record full gym award and increase earned. Emit `ClaimFinalized`. |
| `resolveClaim` | Resolver, CHALLENGED claim, nonzero decision hash. Buyer award no greater than claim amount or unallocated amount. | Mark RESOLVED, authorize buyer award, clear disputed hold. Gym award remains zero. Emit `ClaimResolved`. |
| `proposeTermination` | Either party, OPEN, no active proposal, no live claims. Evidence hash required. Proposed refund may be zero and cannot exceed unallocated. | Create PROPOSED proposal with immutable amount and proposer. While active, block new claims. Emit `TerminationProposed`. |
| `disputeTermination` / `cancelTermination` | Non-proposer party may dispute a PROPOSED proposal with evidence hash. Proposer may cancel while PROPOSED. | DISPUTED or CANCELLED. Cancellation releases active slot. Emit corresponding event. |
| `acceptTermination` / `resolveTermination` | Non-proposer party accepts exact PROPOSED amount. Resolver decides only a DISPUTED proposal with a nonzero decision hash. Both require no live claims and a valid refund budget. | Set proposal ACCEPTED or RESOLVED, mark agreement TERMINATED and increase authorized refund. Emit `AgreementTerminated` with zero decision hash for mutual acceptance. |
| `claimEarned` / `claimRefund` | Merchant / buyer of the agreement respectively. Allowed in OPEN or TERMINATED, including during a dispute. Available amount must be positive. | Update counters before transfer. Send entire available amount to the fixed party. Emit `EarnedClaimed` / `RefundClaimed`. |

A live claim is PROPOSED, CONFIRMED or CHALLENGED. Increment `liveClaims` at proposal and decrement it exactly once on finalization or resolution. Both claim proposal methods require no active termination proposal. Filter claim and termination events by agreement ID to enumerate history. Challenge evidence and decision hashes remain available from events.

A resolved claim authorizes only the stated buyer refund. Any residual stays locked. A decided TIME interval remains consumed for overlap and replay checks, including a zero-award resolution. PT session IDs stay consumed for replay checks even when a claim is resolved with no award.

To allow closure when an active claim is outstanding, the parties first process the claim. Buyer can confirm a delivered PT session or challenge a pending PT proposal. For TIME, buyer may challenge before the deadline. After expiration either party can finalize an unchallenged claim; gym still supplies availability evidence when a claim is disputed. The demo does not infer actual access, pause, closure or delivery from check-ins or block time. A documented interval with interrupted access is handled through scoped resolution. Partial return after closure leaves the undecided balance locked. This interface has no sweep or caller-selected settlement recipient.

## Allocation and exact accounting

Let `P = deposited`. PT value for allocation slot `n` is `mulDiv(P,n,10) - mulDiv(P,n-1,10)`, floor in both terms. PT finalization advances `sessionsFinalized` and `sessionsConsumed`. A PT challenge snapshots the next slot amount, locks it and defers later PT allocation within that agreement. A positive buyer resolution consumes that slot and frees the hold. A zero award frees it without advancing the cursor. Track live claims against remaining capacity. Ordinary undisputed sessions advance the two counters together.

For TIME use `mulDiv(P,to-startAt,endAt-startAt) - mulDiv(P,from-startAt,endAt-startAt)`, floor in both terms. Time and PT formulas use integer multiplication with full-precision division. Allocation happens once per claim. The dispute hold reserves an unallocated amount without changing earnings or authorized refunds. No finalization may spend a hold belonging to another claim. Keep available claim budgets isolated within the agreement, and reject a decision or new claim if its committed allocation would exceed remaining funds.

- `remainingLocked = P - gymWithdrawn - buyerRefunded`
- `withdrawable = earnedFinalized - gymWithdrawn`
- `refundable = refundAuthorized - buyerRefunded`
- `unallocated = P - earnedFinalized - refundAuthorized` (includes any dispute hold)
- `disputedLocked` is a subset of `unallocated`. Pending proposals and documented decisions are read separately from payable balances.

TERMINATED closes claim creation. Existing payable balances remain callable. Money-moving methods use reentrancy protection, SafeERC20 and atomic updates. Failure rolls back both token transfer and counters. Only the configured mock token is in scope.

## Invariants and verification targets

| ID | Required invariant and test target |
| --- | --- |
| I1 | For every agreement, deposit = withdrawn + refunded + locked. Check each step. |
| I2 | Vault token balance ≥ total remaining locked across all agreements. Check multiple agreements. |
| I3 | Withdrawable equals finalized earnings minus withdrawals. Repeated calls cannot pay extra. |
| I4 | PT session ID cannot replay in its agreement. TIME overlap is rejected, including with active claims. Adjacent half-open intervals pass. |
| I5 | TIME earned is independent of check-in count. 0 and 15 check-ins give the same result. |
| I6 | Refund requires a valid scoped decision. Earnings plus authorized refunds ≤ deposit. Repeated refund and conflicting allocation fail. |
| I7 | Wrong actors cannot propose, confirm, resolve or collect. No admin sweep. Resolution pays only the agreement party. |
| I8 | Dispute in agreement A cannot interfere with agreement B or block already payable amounts. |
| I9 | Test rounding across the ten PT allocations and 90-day TIME partition. Check start/end, future intervals, deadline equality and eligibility around boundaries. |
| I10 | Correct wallet can call both payout methods directly against the Vault when the web is unavailable. |
