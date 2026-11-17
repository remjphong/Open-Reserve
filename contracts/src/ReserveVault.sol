// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IReserveVault as V} from "./IReserveVault.sol";

contract ReserveVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error VaultBehaviorNotImplemented(bytes4 selector);

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
                || amount == 0
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
        if (c.state != V.ClaimState.PROPOSED) revert V.InvalidState();

        c.state = V.ClaimState.CONFIRMED;
        emit V.SessionConfirmed(agreementId, claimId);
    }

    function proposeTime(uint256 agreementId, uint64 from, uint64 to, bytes32 evidenceHash)
        external
        returns (uint256 claimId)
    {
        V.Agreement storage a = _agreement(agreementId);
        if (msg.sender != a.merchant) revert V.Unauthorized();
        _requireOpenTime(a);
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
        if (a.policy == V.Policy.PER_SESSION) revert VaultBehaviorNotImplemented(msg.sig);
        if (msg.sender != a.buyer) revert V.Unauthorized();
        _requireOpenTime(a);
        V.Claim storage c = _claim(agreementId, claimId);
        if (c.state != V.ClaimState.PROPOSED) revert V.InvalidState();
        if (evidenceHash == bytes32(0)) revert V.InvalidInput();
        if (block.timestamp >= c.challengeEndsAt) revert V.ChallengeWindowClosed();

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

        // Only gym finalizations advance the head. Refunds retire tail slots.
        uint256 nextSlot = uint256(a.sessionsFinalized) + 1;
        if (nextSlot + a.positiveRefundSlots > PT_SLOTS) revert V.SessionLimit();
        uint256 award = Math.mulDiv(a.deposited, nextSlot, PT_SLOTS) - Math.mulDiv(a.deposited, nextSlot - 1, PT_SLOTS);
        uint256 unallocated = a.deposited - a.earnedFinalized - a.refundAuthorized;
        if (award > unallocated) revert V.InsufficientUnallocated();

        c.state = V.ClaimState.FINALIZED;
        c.settledSessionSlot = uint8(nextSlot);
        c.amount = award;
        c.awardedToGym = award;
        a.sessionsFinalized = uint8(nextSlot);
        ++a.sessionsConsumed;
        --a.liveClaims;
        a.earnedFinalized += award;

        emit V.ClaimFinalized(agreementId, claimId, award);
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

    // Later tasks replace this path with the remaining frozen interface functions.
    fallback() external {
        revert VaultBehaviorNotImplemented(msg.sig);
    }
}
