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
        uint256 challengedSessionClaimId;
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
        uint8 sessionSlot;
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
        uint256 indexed agreementId, uint256 indexed claimId, uint256 gymAmount, uint256 buyerAmount,
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

Deployment on an unsupported chain ID reverts `InvalidTimeProfile`. Set Foundry's chain ID before deployment when simulating either profile. After deployment the profile remains fixed. The agreed v1.0.0 canonical hash is `0xbcb7bf6578cd0ed96b1a90d80b63ef778c9d38eb55b4e8f17ee36bde7c52201c`. Both policies require it, reverting `InvalidTermsHash` on mismatch. The SDK reads the expected hash and profile before opening an agreement. A new terms version or time profile requires a separately approved deployment.

For TIME_ACCESS, require `startAt >= block.timestamp`, `endAt > startAt`, `endAt - startAt == duration` and the supplied `challengeWindow` to equal the immutable configuration, before the token transfer. Revert `InvalidTimeProfile` on mismatch. On claim proposal derive the deadline as `block.timestamp + agreement.challengeWindow` using checked arithmetic. Challenge is legal strictly before that deadline, and unchallenged finalization is legal at or after it. PT requires all three time arguments to be zero.

## Writes and transitions

| Write | Actor and guards | Result and event |
| --- | --- | --- |
| `openAgreement` | Buyer is caller. Nonzero amount and exact canonical terms hash. Enforce the configured policy and timestamps above before touching balances. Buyer approves the ERC-20 before calling. | Transfer from buyer to Vault via SafeERC20. Require exact receipt. Set OPEN and deposit counters. Emit `AgreementOpened`. |
| `proposeSession` | Merchant, OPEN PT agreement, nonzero unique session ID and evidence hash. Session already delivered per terms. Check capacity against consumed slots plus live claims. Reserve one unit of capacity, with the monetary slot assigned later. | PROPOSED. Time fields and `amount` are 0 until allocation. Emit `ClaimProposed`. |
| `confirmSession` | Buyer, PROPOSED or CHALLENGED PT claim. | For PROPOSED, mark CONFIRMED and emit `SessionConfirmed`. For CHALLENGED, record buyer confirmation and atomically finalize the reserved slot for gym, release its hold and emit `SessionConfirmed` then `ClaimFinalized`. |
| `proposeTime` | Merchant, OPEN TIME agreement, nonzero evidence hash. Require `startAt <= from < to <= endAt` and `to <= block.timestamp`. Reject overlap with active or previously decided intervals. Adjacent intervals are allowed. | PROPOSED. Store calculated amount and immutable deadline; emit `ClaimProposed`. |
| `challengeClaim` | Buyer, PROPOSED claim. For TIME, strictly before deadline. Nonzero objection evidence hash. | CHALLENGED. PT permits one active challenge per agreement and snapshots the next allocation slot. Record the challenged claim ID even when the hold is zero. Emit `ClaimChallenged`. |
| `finalizeClaim` | Either agreement party with a CONFIRMED PT claim or an unchallenged PROPOSED TIME claim at or after deadline. OPEN agreement. Ordinary PT finalization requires no active PT challenge, reverting `SessionAllocationHeld` otherwise. | Mark FINALIZED, record full gym award and increase earned. Emit `ClaimFinalized`. |
| `resolveClaim` | Resolver, OPEN agreement, CHALLENGED claim, nonzero decision hash. Apply the policy-specific award limits below. | Mark RESOLVED, increase `earnedFinalized` and `refundAuthorized` by their respective awards, clear this claim’s hold and decrement live claims once. Emit both award amounts in `ClaimResolved`. |
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

For PT, a resolver-only decision requires `gymAmount = 0` because v1.0.0 requires buyer confirmation before a session can earn. If the resolver finds the PT session valid, gym can receive the slot allocation when the buyer confirms the challenged session on-chain before any terminal resolver decision. A unilateral PT gym award would require a change to the approved terms.

### PT counters and transitions

`sessionsFinalized` counts buyer-confirmed PT sessions settled for gym, including zero-value rounded slots. `sessionsConsumed` is the last spent monetary slot, including slots allocated to a buyer by a positive PT resolution. `liveClaims` counts all live claims in the agreement. TIME agreements keep both session counters and the challenged PT claim pointer at zero.

| PT transition | Slot action | Δ finalized | Δ consumed | Δ live |
| --- | --- | ---: | ---: | ---: |
| Propose | Reserve capacity only, `sessionSlot = 0` | 0 | 0 | +1 |
| Confirm a proposed claim | Keep capacity reserved until settlement | 0 | 0 | 0 |
| Challenge a proposed claim | Snapshot slot `sessionsConsumed + 1` and amount. Set `challengedSessionClaimId`. | 0 | 0 | 0 |
| Finalize an ordinary confirmed claim | Use next slot. Require no hold pointer. | +1 | +1 | −1 |
| Buyer confirms challenged claim | Finalize the snapshotted slot. Release and clear pointer. | +1 | +1 | −1 |
| Resolver authorizes positive buyer award | Consume the whole slot index. Release and clear pointer. Any unawarded money stays unallocated. | 0 | +1 | −1 |
| Resolver decides zero award | Release and clear pointer. Keep slot index available for a different session. | 0 | 0 | −1 |

Enforce `sessionsFinalized <= sessionsConsumed` and `sessionsConsumed + liveClaims <= 10` for PT. The single PT dispute pointer, rather than the value of the hold, blocks ordinary PT settlement and a second PT challenge. The slot index recorded on a zero-award resolution denotes the released reservation, while the terminal claim ID and session ID remain spent. For example, with `P = 1003`, a positive buyer award of 40 from slot 1 (budget 100) leaves 60 unallocated. The next session can consume only slot 2. A later refund of an unallocated residual requires the termination decision process.

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
