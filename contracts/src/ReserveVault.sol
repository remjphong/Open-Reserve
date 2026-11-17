// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IReserveVault as V} from "./IReserveVault.sol";

contract ReserveVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 private constant TERMS_HASH = 0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8;

    address public immutable token;
    address public immutable resolver;
    uint64 private immutable ACCESS_DURATION;
    uint64 private immutable DISPUTE_WINDOW;
    uint256 private agreementCount;
    uint8 private constant PT_SLOTS = 10;
    enum IntervalOccupancy {
        EMPTY,
        PARTIAL,
        FULL
    }

    mapping(uint256 => V.Agreement) private agreements;
    mapping(uint256 => uint256) private claimCounts;
    mapping(uint256 => mapping(uint256 => V.Claim)) private claims;
    mapping(uint256 => mapping(bytes32 => bool)) private usedSessions;
    mapping(uint256 => mapping(uint256 => IntervalOccupancy)) private timeOccupancy;

    mapping(uint256 => uint256) private terminationCounts;
    mapping(uint256 => uint256) private activeTerminationIds;
    mapping(uint256 => mapping(uint256 => V.Termination)) private terminations;

    constructor(address token_, address resolver_) {
        if (token_.code.length == 0 || resolver_ == address(0)) revert V.InvalidInput();
        token = token_;
        resolver = resolver_;

        if (block.chainid == 31337) {
            ACCESS_DURATION = 90 days;
            DISPUTE_WINDOW = 1 days;
        } else if (block.chainid == 43113) {
            ACCESS_DURATION = 270;
            DISPUTE_WINDOW = 60;
        } else {
            revert V.InvalidTimeProfile();
        }
    }

    function timeAccessConfig() external view returns (uint64 duration, uint64 challengeWindow, bytes32 termsHash) {
        return (ACCESS_DURATION, DISPUTE_WINDOW, TERMS_HASH);
    }

    function openAgreement(
        address merchant,
        V.Policy policy,
        uint256 amount,
        bytes32 termsHash,
        uint64 startAt,
        uint64 endAt,
        uint64 challengeWindow
    ) external nonReentrant returns (uint256 agreementId) {
        if (
            merchant == address(0) || merchant == msg.sender || merchant == resolver || msg.sender == resolver
                || merchant == address(this) || amount == 0
        ) revert V.InvalidInput();
        if (termsHash != TERMS_HASH) revert V.InvalidTermsHash();
        if (policy == V.Policy.PER_SESSION) {
            if (startAt != 0 || endAt != 0 || challengeWindow != 0) revert V.InvalidTimeProfile();
        } else {
            if (
                startAt < block.timestamp || endAt <= startAt || endAt - startAt != ACCESS_DURATION
                    || challengeWindow != DISPUTE_WINDOW
            ) revert V.InvalidTimeProfile();
        }

        IERC20 reserveToken = IERC20(token);
        uint256 balanceBefore = reserveToken.balanceOf(address(this));
        reserveToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = reserveToken.balanceOf(address(this));
        if (balanceAfter < balanceBefore || balanceAfter - balanceBefore != amount) {
            revert V.UnexpectedTokenReceipt();
        }

        agreementId = ++agreementCount;
        V.Agreement storage agreement = agreements[agreementId];
        agreement.buyer = msg.sender;
        agreement.merchant = merchant;
        agreement.policy = policy;
        agreement.state = V.AgreementState.OPEN;
        agreement.termsHash = termsHash;
        agreement.startAt = startAt;
        agreement.endAt = endAt;
        agreement.challengeWindow = challengeWindow;
        agreement.deposited = amount;

        emit V.AgreementOpened(
            agreementId, msg.sender, merchant, policy, amount, termsHash, startAt, endAt, challengeWindow
        );
    }

    function proposeSession(uint256 agreementId, bytes32 sessionId, bytes32 evidenceHash)
        external
        returns (uint256 claimId)
    {
        V.Agreement storage a = _agreement(agreementId);
        if (msg.sender != a.merchant) revert V.Unauthorized();
        _requireOpenPt(a);
        if (activeTerminationIds[agreementId] != 0) revert V.InvalidState();
        if (sessionId == bytes32(0) || evidenceHash == bytes32(0)) revert V.InvalidInput();
        if (usedSessions[agreementId][sessionId]) revert V.DuplicateSession();
        if (uint256(a.sessionsConsumed) + a.liveClaims >= PT_SLOTS) revert V.SessionLimit();
        if (block.timestamp > type(uint64).max) revert V.InvalidInput();

        claimId = ++claimCounts[agreementId];
        V.Claim storage c = claims[agreementId][claimId];
        c.state = V.ClaimState.PROPOSED;
        c.sessionId = sessionId;
        c.evidenceHash = evidenceHash;
        c.proposedAt = uint64(block.timestamp);
        usedSessions[agreementId][sessionId] = true;
        ++a.liveClaims;

        emit V.ClaimProposed(agreementId, claimId, sessionId, evidenceHash, 0, 0, c.proposedAt, 0, 0);
    }

    function cancelSessionProposal(uint256 agreementId, uint256 claimId) external {
        V.Agreement storage a = _agreement(agreementId);
        if (msg.sender != a.buyer && msg.sender != a.merchant) revert V.Unauthorized();
        _requireOpenPt(a);
        V.Claim storage c = _claim(agreementId, claimId);
        if (c.state != V.ClaimState.PROPOSED) revert V.InvalidState();

        c.state = V.ClaimState.CANCELLED;
        --a.liveClaims;
        emit V.SessionProposalCancelled(agreementId, claimId, c.sessionId, msg.sender);
    }

    function confirmSession(uint256 agreementId, uint256 claimId) external {
        V.Agreement storage a = _agreement(agreementId);
        if (msg.sender != a.buyer) revert V.Unauthorized();
        _requireOpenPt(a);
        V.Claim storage c = _claim(agreementId, claimId);
        if (c.state == V.ClaimState.CHALLENGED) {
            _releaseSessionHold(a, c, claimId);
            emit V.SessionConfirmed(agreementId, claimId);
            _finalizeSession(agreementId, claimId, a, c, c.reservedGymSlot, c.reservedGymAmount);
        } else {
            if (c.state != V.ClaimState.PROPOSED) revert V.InvalidState();
            c.state = V.ClaimState.CONFIRMED;
            emit V.SessionConfirmed(agreementId, claimId);
        }
    }

    function proposeTime(uint256 agreementId, uint64 from, uint64 to, bytes32 evidenceHash)
        external
        returns (uint256 claimId)
    {
        V.Agreement storage a = _agreement(agreementId);
        if (msg.sender != a.merchant) revert V.Unauthorized();
        _requireOpenTime(a);
        if (activeTerminationIds[agreementId] != 0) revert V.InvalidState();
        if (evidenceHash == bytes32(0)) revert V.InvalidInput();
        if (from < a.startAt || from >= to || to > a.endAt || to > block.timestamp) revert V.InvalidInterval();
        if (block.timestamp > type(uint64).max - a.challengeWindow) revert V.InvalidInput();

        uint64 duration = a.endAt - a.startAt;
        uint64 left = from - a.startAt;
        uint64 right = to - a.startAt;
        _reserveTimeInterval(agreementId, 1, 0, duration, left, right);

        claimId = ++claimCounts[agreementId];
        V.Claim storage c = claims[agreementId][claimId];
        c.state = V.ClaimState.PROPOSED;
        c.evidenceHash = evidenceHash;
        c.from = from;
        c.to = to;
        c.proposedAt = uint64(block.timestamp);
        c.challengeEndsAt = c.proposedAt + a.challengeWindow;
        c.amount = Math.mulDiv(a.deposited, right, duration) - Math.mulDiv(a.deposited, left, duration);
        ++a.liveClaims;

        emit V.ClaimProposed(
            agreementId, claimId, bytes32(0), evidenceHash, from, to, c.proposedAt, c.challengeEndsAt, c.amount
        );
    }

    function challengeClaim(uint256 agreementId, uint256 claimId, bytes32 evidenceHash) external {
        V.Agreement storage a = _agreement(agreementId);
        if (msg.sender != a.buyer) revert V.Unauthorized();
        if (a.state != V.AgreementState.OPEN) revert V.InvalidState();
        V.Claim storage c = _claim(agreementId, claimId);
        if (c.state != V.ClaimState.PROPOSED) revert V.InvalidState();
        if (evidenceHash == bytes32(0)) revert V.InvalidInput();

        if (a.policy == V.Policy.PER_SESSION) {
            if (a.challengedSessionClaimId != 0) revert V.SessionAllocationHeld();
            c.reservedGymSlot = a.sessionsFinalized + 1;
            c.reservedRefundSlot = PT_SLOTS - a.positiveRefundSlots;
            c.reservedGymAmount = _slotAward(a.deposited, c.reservedGymSlot);
            c.reservedRefundAmount = _slotAward(a.deposited, c.reservedRefundSlot);
            c.amount = Math.max(c.reservedGymAmount, c.reservedRefundAmount);
            if (c.amount > _unallocated(a)) revert V.InsufficientUnallocated();
            a.challengedSessionClaimId = claimId;
        } else if (block.timestamp >= c.challengeEndsAt) {
            revert V.ChallengeWindowClosed();
        }

        c.state = V.ClaimState.CHALLENGED;
        a.disputedLocked += c.amount;
        emit V.ClaimChallenged(agreementId, claimId, evidenceHash);
    }

    function finalizeClaim(uint256 agreementId, uint256 claimId) external {
        V.Agreement storage a = _agreement(agreementId);
        if (msg.sender != a.buyer && msg.sender != a.merchant) revert V.Unauthorized();
        if (a.policy == V.Policy.TIME_ACCESS) {
            _finalizeTime(agreementId, claimId, a);
            return;
        }
        _requireOpenPt(a);
        V.Claim storage c = _claim(agreementId, claimId);
        if (c.state != V.ClaimState.CONFIRMED) revert V.InvalidState();
        if (a.challengedSessionClaimId != 0) revert V.SessionAllocationHeld();

        uint8 nextSlot = a.sessionsFinalized + 1;
        _finalizeSession(agreementId, claimId, a, c, nextSlot, _slotAward(a.deposited, nextSlot));
    }

    function resolveClaim(
        uint256 agreementId,
        uint256 claimId,
        uint256 gymAmount,
        uint256 buyerAmount,
        bytes32 decisionHash
    ) external {
        V.Agreement storage a = _agreement(agreementId);
        if (msg.sender != resolver) revert V.Unauthorized();
        if (a.state != V.AgreementState.OPEN) revert V.InvalidState();
        V.Claim storage c = _claim(agreementId, claimId);
        if (c.state != V.ClaimState.CHALLENGED) revert V.InvalidState();
        if (decisionHash == bytes32(0)) revert V.InvalidInput();

        uint8 retiredSlot;
        if (a.policy == V.Policy.PER_SESSION) {
            if (gymAmount != 0) revert V.InvalidInput();
            if (buyerAmount > c.reservedRefundAmount) revert V.InsufficientUnallocated();
            _releaseSessionHold(a, c, claimId);
            if (buyerAmount != 0) {
                retiredSlot = c.reservedRefundSlot;
                c.settledSessionSlot = retiredSlot;
                ++a.positiveRefundSlots;
                ++a.sessionsConsumed;
            }
        } else {
            if (gymAmount > c.amount || buyerAmount > c.amount - gymAmount) {
                revert V.InsufficientUnallocated();
            }
            a.disputedLocked -= c.amount;
        }

        if (gymAmount + buyerAmount > _unallocated(a) - a.disputedLocked) {
            revert V.InsufficientUnallocated();
        }
        c.state = V.ClaimState.RESOLVED;
        c.awardedToGym = gymAmount;
        c.awardedToBuyer = buyerAmount;
        --a.liveClaims;
        a.earnedFinalized += gymAmount;
        a.refundAuthorized += buyerAmount;
        emit V.ClaimResolved(agreementId, claimId, c.sessionId, gymAmount, buyerAmount, retiredSlot, decisionHash);
    }

    function proposeTermination(uint256 agreementId, uint256 proposedRefund, bytes32 evidenceHash)
        external
        returns (uint256 proposalId)
    {
        V.Agreement storage a = _agreement(agreementId);
        _requireParty(a);
        if (activeTerminationIds[agreementId] != 0) revert V.InvalidState();
        if (evidenceHash == bytes32(0) || (a.state == V.AgreementState.TERMINATED && proposedRefund == 0)) {
            revert V.InvalidInput();
        }
        _checkTerminationBudget(a, proposedRefund);

        proposalId = ++terminationCounts[agreementId];
        terminations[agreementId][proposalId] =
            V.Termination(V.TerminationState.PROPOSED, msg.sender, proposedRefund, evidenceHash);
        activeTerminationIds[agreementId] = proposalId;
        emit V.TerminationProposed(agreementId, proposalId, msg.sender, proposedRefund, evidenceHash);
    }

    function disputeTermination(uint256 agreementId, uint256 proposalId, bytes32 evidenceHash) external {
        V.Agreement storage a = _agreement(agreementId);
        _requireParty(a);
        V.Termination storage t = _termination(agreementId, proposalId);
        if (msg.sender == t.proposer) revert V.Unauthorized();
        if (t.state != V.TerminationState.PROPOSED) revert V.InvalidState();
        if (evidenceHash == bytes32(0)) revert V.InvalidInput();

        t.state = V.TerminationState.DISPUTED;
        emit V.TerminationDisputed(agreementId, proposalId, evidenceHash);
    }

    function cancelTermination(uint256 agreementId, uint256 proposalId) external {
        _agreement(agreementId);
        V.Termination storage t = _termination(agreementId, proposalId);
        if (msg.sender != t.proposer) revert V.Unauthorized();
        if (t.state != V.TerminationState.PROPOSED) revert V.InvalidState();

        t.state = V.TerminationState.CANCELLED;
        delete activeTerminationIds[agreementId];
        emit V.TerminationCancelled(agreementId, proposalId);
    }

    function acceptTermination(uint256 agreementId, uint256 proposalId) external {
        V.Agreement storage a = _agreement(agreementId);
        _requireParty(a);
        V.Termination storage t = _termination(agreementId, proposalId);
        if (msg.sender == t.proposer) revert V.Unauthorized();
        if (t.state != V.TerminationState.PROPOSED) revert V.InvalidState();

        _checkTerminationBudget(a, t.proposedRefund);
        t.state = V.TerminationState.ACCEPTED;
        _settleTermination(agreementId, proposalId, a, t.proposedRefund, false, bytes32(0));
    }

    function resolveTermination(uint256 agreementId, uint256 proposalId, uint256 refundAmount, bytes32 decisionHash)
        external
    {
        V.Agreement storage a = _agreement(agreementId);
        if (msg.sender != resolver) revert V.Unauthorized();
        V.Termination storage t = _termination(agreementId, proposalId);
        if (t.state != V.TerminationState.DISPUTED) revert V.InvalidState();
        if (decisionHash == bytes32(0)) revert V.InvalidInput();

        _checkTerminationBudget(a, refundAmount);
        t.state = V.TerminationState.RESOLVED;
        _settleTermination(agreementId, proposalId, a, refundAmount, true, decisionHash);
    }

    function claimEarned(uint256 agreementId) external nonReentrant returns (uint256 amount) {
        V.Agreement storage a = _agreement(agreementId);
        if (msg.sender != a.merchant) revert V.Unauthorized();
        amount = a.earnedFinalized - a.gymWithdrawn;
        if (amount == 0) revert V.NothingToClaim();

        a.gymWithdrawn += amount;
        IERC20(token).safeTransfer(a.merchant, amount);
        emit V.EarnedClaimed(agreementId, a.merchant, amount);
    }

    function claimRefund(uint256 agreementId) external nonReentrant returns (uint256 amount) {
        V.Agreement storage a = _agreement(agreementId);
        if (msg.sender != a.buyer) revert V.Unauthorized();
        amount = a.refundAuthorized - a.buyerRefunded;
        if (amount == 0) revert V.NothingToClaim();

        a.buyerRefunded += amount;
        IERC20(token).safeTransfer(a.buyer, amount);
        emit V.RefundClaimed(agreementId, a.buyer, amount);
    }

    function getTermination(uint256 agreementId, uint256 proposalId) external view returns (V.Termination memory) {
        _agreement(agreementId);
        return _termination(agreementId, proposalId);
    }

    function getActiveTerminationId(uint256 agreementId) external view returns (uint256) {
        _agreement(agreementId);
        return activeTerminationIds[agreementId];
    }

    function getClaim(uint256 agreementId, uint256 claimId) external view returns (V.Claim memory) {
        _agreement(agreementId);
        return _claim(agreementId, claimId);
    }

    function getAgreement(uint256 agreementId) external view returns (V.Agreement memory) {
        return _agreement(agreementId);
    }

    function getBalances(uint256 agreementId)
        external
        view
        returns (
            uint256 remainingLocked,
            uint256 withdrawable,
            uint256 refundable,
            uint256 disputedLocked,
            uint256 unallocated
        )
    {
        V.Agreement storage agreement = _agreement(agreementId);
        return (
            agreement.deposited - agreement.gymWithdrawn - agreement.buyerRefunded,
            agreement.earnedFinalized - agreement.gymWithdrawn,
            agreement.refundAuthorized - agreement.buyerRefunded,
            agreement.disputedLocked,
            agreement.deposited - agreement.earnedFinalized - agreement.refundAuthorized
        );
    }

    function _agreement(uint256 agreementId) private view returns (V.Agreement storage agreement) {
        agreement = agreements[agreementId];
        if (agreement.state == V.AgreementState.NONE) revert V.NotFound();
    }

    function _claim(uint256 agreementId, uint256 claimId) private view returns (V.Claim storage c) {
        c = claims[agreementId][claimId];
        if (c.state == V.ClaimState.NONE) revert V.NotFound();
    }

    function _termination(uint256 agreementId, uint256 proposalId) private view returns (V.Termination storage t) {
        t = terminations[agreementId][proposalId];
        if (t.state == V.TerminationState.NONE) revert V.NotFound();
    }

    function _requireParty(V.Agreement storage a) private view {
        if (msg.sender != a.buyer && msg.sender != a.merchant) revert V.Unauthorized();
    }

    function _checkTerminationBudget(V.Agreement storage a, uint256 refundAmount) private view {
        if (a.liveClaims != 0) revert V.LiveClaims();
        if (refundAmount > _unallocated(a)) revert V.InsufficientUnallocated();
    }

    function _settleTermination(
        uint256 agreementId,
        uint256 proposalId,
        V.Agreement storage a,
        uint256 refundAmount,
        bool viaResolver,
        bytes32 decisionHash
    ) private {
        delete activeTerminationIds[agreementId];
        a.refundAuthorized += refundAmount;
        if (a.state == V.AgreementState.OPEN) {
            a.state = V.AgreementState.TERMINATED;
            emit V.AgreementTerminated(agreementId, proposalId, msg.sender, viaResolver, refundAmount, decisionHash);
        } else {
            emit V.TerminationRefundAuthorized(
                agreementId, proposalId, msg.sender, viaResolver, refundAmount, decisionHash
            );
        }
    }

    function _unallocated(V.Agreement storage a) private view returns (uint256) {
        return a.deposited - a.earnedFinalized - a.refundAuthorized;
    }

    function _slotAward(uint256 deposit, uint8 slot) private pure returns (uint256) {
        return Math.mulDiv(deposit, slot, PT_SLOTS) - Math.mulDiv(deposit, slot - 1, PT_SLOTS);
    }

    function _releaseSessionHold(V.Agreement storage a, V.Claim storage c, uint256 claimId) private {
        if (a.challengedSessionClaimId != claimId) revert V.InvalidState();
        a.challengedSessionClaimId = 0;
        a.disputedLocked -= c.amount;
    }

    function _finalizeSession(
        uint256 agreementId,
        uint256 claimId,
        V.Agreement storage a,
        V.Claim storage c,
        uint8 slot,
        uint256 award
    ) private {
        if (uint256(slot) + a.positiveRefundSlots > PT_SLOTS) revert V.SessionLimit();
        if (award > _unallocated(a)) revert V.InsufficientUnallocated();

        c.state = V.ClaimState.FINALIZED;
        c.settledSessionSlot = slot;
        c.amount = award;
        c.awardedToGym = award;
        a.sessionsFinalized = slot;
        ++a.sessionsConsumed;
        --a.liveClaims;
        a.earnedFinalized += award;
        emit V.ClaimFinalized(agreementId, claimId, award);
    }

    function _finalizeTime(uint256 agreementId, uint256 claimId, V.Agreement storage a) private {
        _requireOpenTime(a);
        V.Claim storage c = _claim(agreementId, claimId);
        if (c.state != V.ClaimState.PROPOSED) revert V.InvalidState();
        if (block.timestamp < c.challengeEndsAt) revert V.ChallengeWindowOpen();
        uint256 unallocated = a.deposited - a.earnedFinalized - a.refundAuthorized - a.disputedLocked;
        if (c.amount > unallocated) revert V.InsufficientUnallocated();

        c.state = V.ClaimState.FINALIZED;
        c.awardedToGym = c.amount;
        --a.liveClaims;
        a.earnedFinalized += c.amount;
        emit V.ClaimFinalized(agreementId, claimId, c.amount);
    }

    // A sparse interval tree reserves elapsed seconds permanently. Work is bounded by the
    // depth of the fixed agreement duration, independent of the number of prior claims.
    function _reserveTimeInterval(uint256 agreementId, uint256 node, uint64 start, uint64 end, uint64 from, uint64 to)
        private
    {
        IntervalOccupancy occupancy = timeOccupancy[agreementId][node];
        if (occupancy == IntervalOccupancy.FULL) revert V.OverlappingInterval();
        if (from <= start && end <= to) {
            if (occupancy != IntervalOccupancy.EMPTY) revert V.OverlappingInterval();
            timeOccupancy[agreementId][node] = IntervalOccupancy.FULL;
            return;
        }

        if (occupancy == IntervalOccupancy.EMPTY) timeOccupancy[agreementId][node] = IntervalOccupancy.PARTIAL;
        uint64 midpoint = start + (end - start) / 2;
        if (from < midpoint) _reserveTimeInterval(agreementId, node * 2, start, midpoint, from, to);
        if (to > midpoint) _reserveTimeInterval(agreementId, node * 2 + 1, midpoint, end, from, to);
    }

    function _requireOpenTime(V.Agreement storage a) private view {
        if (a.state != V.AgreementState.OPEN || a.policy != V.Policy.TIME_ACCESS) revert V.InvalidState();
    }

    function _requireOpenPt(V.Agreement storage a) private view {
        if (a.state != V.AgreementState.OPEN || a.policy != V.Policy.PER_SESSION) {
            revert V.InvalidState();
        }
    }
}
