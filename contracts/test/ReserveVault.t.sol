// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IReserveVault as V} from "../src/IReserveVault.sol";
import {ReserveVault} from "../src/ReserveVault.sol";

interface Vm {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
    function expectEmit(bool, bool, bool, bool, address) external;
}

contract TestToken is ERC20 {
    constructor(address buyer) ERC20("Reserve test fixture", "RTF") {
        _mint(buyer, 1_000_000);
    }
}

contract ReserveVaultTest {
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant BUYER = address(0xB001);
    address private constant GYM = address(0x6001);
    address private constant RESOLVER = address(0xA001);
    address private constant OTHER = address(0xF001);
    bytes32 private constant TERMS = 0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8;
    bytes32 private constant EVIDENCE = keccak256("fixture evidence");
    bytes32 private constant DECISION = keccak256("fixture decision");
    uint64 private constant START = 100_000;
    uint64 private constant DAY = 1 days;

    TestToken private token;
    V private vault;

    function setUp() public {
        VM.chainId(31337);
        VM.warp(START);
        token = new TestToken(BUYER);
        vault = V(address(new ReserveVault(address(token), RESOLVER)));
        VM.prank(BUYER);
        token.approve(address(vault), type(uint256).max);
    }

    function test_DepositTransfersExactlyAndOpensAgreement() public {
        uint256 buyerBefore = token.balanceOf(BUYER);
        uint256 id = _pt(1003);
        V.Agreement memory a = vault.getAgreement(id);
        require(id == 1 && a.state == V.AgreementState.OPEN, "new agreement");
        require(a.buyer == BUYER && a.merchant == GYM && a.termsHash == TERMS, "identity");
        require(a.policy == V.Policy.PER_SESSION && a.deposited == 1003, "deposit record");
        require(token.balanceOf(BUYER) == buyerBefore - 1003, "buyer debit");
        require(token.balanceOf(address(vault)) == 1003, "vault receipt");
        _ledger(id, 1003, 0, 0, 0, 1003);
    }

    function test_DepositRejectsUnapprovedTermsBeforeTransfer() public {
        _reject(BUYER, V.InvalidTermsHash.selector);
        vault.openAgreement(GYM, V.Policy.PER_SESSION, 900, EVIDENCE, 0, 0, 0);
        require(token.balanceOf(address(vault)) == 0, "no token movement");
    }

    function test_TimeConfigurationLocal() public view {
        (uint64 duration, uint64 window, bytes32 hash) = vault.timeAccessConfig();
        require(duration == 90 * DAY && window == DAY && hash == TERMS, "local profile");
    }

    function test_TimeConfigurationFujiRejectsShortenedWindow() public {
        VM.chainId(43113);
        V fuji = V(address(new ReserveVault(address(token), RESOLVER)));
        (uint64 duration, uint64 window, bytes32 hash) = fuji.timeAccessConfig();
        require(duration == 270 && window == 60 && hash == TERMS, "Fuji profile");
        VM.prank(BUYER);
        token.approve(address(fuji), 900);
        _reject(BUYER, V.InvalidTimeProfile.selector);
        fuji.openAgreement(GYM, V.Policy.TIME_ACCESS, 900, TERMS, START, START + 270, 59);
        VM.prank(BUYER);
        uint256 id = fuji.openAgreement(GYM, V.Policy.TIME_ACCESS, 900, TERMS, START, START + 270, 60);
        V.Agreement memory a = fuji.getAgreement(id);
        require(a.endAt - a.startAt == 270 && a.challengeWindow == 60, "stored Fuji settings");
    }

    function test_TimeRejectsShortenedLocalDurationAndWindow() public {
        _reject(BUYER, V.InvalidTimeProfile.selector);
        vault.openAgreement(GYM, V.Policy.TIME_ACCESS, 900, TERMS, START, START + 89 * DAY, DAY);
        _reject(BUYER, V.InvalidTimeProfile.selector);
        vault.openAgreement(GYM, V.Policy.TIME_ACCESS, 900, TERMS, START, START + 90 * DAY, DAY - 1);
    }

    function test_PtRequiresBuyerConfirmation() public {
        uint256 id = _pt(1003);
        uint256 claim = _session(id, 1);
        _reject(GYM, V.InvalidState.selector);
        vault.finalizeClaim(id, claim);
        _confirm(id, claim);
        _finalize(id, claim);
        _ledger(id, 1003, 100, 0, 0, 903);
    }

    function test_PtTenSessionsRoundAndWithdrawExactlyOnce() public {
        uint256 id = _pt(1003);
        for (uint256 n = 1; n <= 10; n++) {
            uint256 claim = _session(id, n);
            _confirm(id, claim);
            _finalize(id, claim);
            V.Claim memory c = vault.getClaim(id, claim);
            require(c.settledSessionSlot == n, "head slot must follow settlement order");
            require(c.awardedToGym == 1003 * n / 10 - 1003 * (n - 1) / 10, "rounding");
        }
        _reject(GYM, V.SessionLimit.selector);
        vault.proposeSession(id, bytes32(uint256(11)), EVIDENCE);
        VM.prank(GYM);
        require(vault.claimEarned(id) == 1003, "full earned claim");
        _reject(GYM, V.NothingToClaim.selector);
        vault.claimEarned(id);
        require(token.balanceOf(GYM) == 1003, "single gym transfer");
        _ledger(id, 0, 0, 0, 0, 0);
    }

    function test_PtRejectsNonPartyActionsAndDuplicateSession() public {
        uint256 id = _pt(900);
        _reject(OTHER, V.Unauthorized.selector);
        vault.proposeSession(id, bytes32(uint256(1)), EVIDENCE);
        uint256 claim = _session(id, 1);
        _reject(GYM, V.DuplicateSession.selector);
        vault.proposeSession(id, bytes32(uint256(1)), EVIDENCE);
        _reject(GYM, V.Unauthorized.selector);
        vault.confirmSession(id, claim);
        _confirm(id, claim);
        _reject(OTHER, V.Unauthorized.selector);
        vault.finalizeClaim(id, claim);
        _finalize(id, claim);
        _reject(OTHER, V.Unauthorized.selector);
        vault.claimEarned(id);
    }

    function test_PtTwoEndedRefundsBeforeGymAndSupplementalTermination() public {
        uint256 id = _pt(1003);
        uint256 first = _challengeSession(id, 1);
        _resolve(id, first, 0, 40);
        require(vault.getClaim(id, first).settledSessionSlot == 10, "retired tail 10");
        uint256 second = _challengeSession(id, 2);
        _resolve(id, second, 0, 100);
        require(vault.getClaim(id, second).settledSessionSlot == 9, "retired tail 9");
        _ledger(id, 1003, 0, 140, 0, 863);

        for (uint256 n = 1; n <= 8; n++) {
            uint256 claim = _session(id, n + 2);
            _confirm(id, claim);
            _finalize(id, claim);
            V.Claim memory c = vault.getClaim(id, claim);
            require(c.settledSessionSlot == n, "refund must not advance gym head");
            require(c.awardedToGym == 1003 * n / 10 - 1003 * (n - 1) / 10, "gym rounding");
        }
        V.Agreement memory a = vault.getAgreement(id);
        require(a.sessionsFinalized == 8 && a.positiveRefundSlots == 2, "two-ended counters");
        require(a.sessionsConsumed == 10 && a.liveClaims == 0, "slot conservation");
        _ledger(id, 1003, 802, 140, 0, 61);
        _terminate(id, 30);
        _terminate(id, 31);
        _payoutBoth(id, 802, 201);
        _ledger(id, 0, 0, 0, 0, 0);
    }

    function test_PtRefundDoesNotAdvanceGymRoundingIndex() public {
        uint256 id = _pt(1009);
        _resolve(id, _challengeSession(id, 1), 0, 40);
        uint256 claim = _session(id, 2);
        _confirm(id, claim);
        _finalize(id, claim);
        require(vault.getClaim(id, claim).awardedToGym == 100, "head 1 rather than slot 2");
    }

    function test_PtZeroAwardRetainsCapacityButBurnsSessionId() public {
        uint256 id = _pt(900);
        uint256 claim = _challengeSession(id, 1);
        _resolve(id, claim, 0, 0);
        V.Agreement memory a = vault.getAgreement(id);
        require(a.sessionsConsumed == 0 && a.liveClaims == 0, "capacity returned");
        require(vault.getClaim(id, claim).settledSessionSlot == 0, "no allocated slot");
        _reject(GYM, V.DuplicateSession.selector);
        vault.proposeSession(id, bytes32(uint256(1)), EVIDENCE);
        uint256 next = _session(id, 2);
        _confirm(id, next);
        _finalize(id, next);
        require(vault.getClaim(id, next).settledSessionSlot == 1, "head slot available");
    }

    function test_PtZeroValueHoldStillBlocksOtherAllocations() public {
        uint256 id = _pt(2);
        _resolve(id, _challengeSession(id, 1), 0, 1);
        uint256 held = _challengeSession(id, 2);
        V.Agreement memory a = vault.getAgreement(id);
        require(a.disputedLocked == 0 && a.challengedSessionClaimId == held, "zero hold has pointer");
        uint256 next = _session(id, 3);
        _confirm(id, next);
        _reject(GYM, V.SessionAllocationHeld.selector);
        vault.finalizeClaim(id, next);
        _confirm(id, held);
        a = vault.getAgreement(id);
        require(a.sessionsFinalized == 1 && a.sessionsConsumed == 2, "zero gym slot consumed");
    }

    function test_PtLastSlotConfirmationAndResolutionCannotBothSettle() public {
        _lastSlot(true);
        _lastSlot(false);
    }

    function _lastSlot(bool confirmFirst) private {
        uint256 id = _pt(1003);
        for (uint256 n = 1; n < 10; n++) {
            uint256 claim = _session(id, n);
            _confirm(id, claim);
            _finalize(id, claim);
        }
        uint256 last = _challengeSession(id, 10);
        V.Claim memory c = vault.getClaim(id, last);
        require(c.reservedGymSlot == 10 && c.reservedRefundSlot == 10, "same last slot");
        if (confirmFirst) {
            _confirm(id, last);
            _reject(RESOLVER, V.InvalidState.selector);
            vault.resolveClaim(id, last, 0, 101, DECISION);
        } else {
            _resolve(id, last, 0, 101);
            _reject(BUYER, V.InvalidState.selector);
            vault.confirmSession(id, last);
        }
        require(vault.getAgreement(id).sessionsConsumed == 10, "last slot consumed once");
    }

    function test_PtCancellationReleasesCapacityAndEmitsIndexerEvent() public {
        _assertCancellation(BUYER);
        _assertCancellation(GYM);
    }

    function _assertCancellation(address actor) private {
        uint256 id = _pt(900);
        uint256 claim = _session(id, 1);
        VM.expectEmit(true, true, true, true, address(vault));
        emit V.SessionProposalCancelled(id, claim, bytes32(uint256(1)), actor);
        VM.prank(actor);
        vault.cancelSessionProposal(id, claim);
        require(vault.getClaim(id, claim).state == V.ClaimState.CANCELLED, "cancelled");
        V.Agreement memory a = vault.getAgreement(id);
        require(a.liveClaims == 0 && a.sessionsConsumed == 0, "capacity, no slot");
        _ledger(id, 900, 0, 0, 0, 900);
        _reject(GYM, V.DuplicateSession.selector);
        vault.proposeSession(id, bytes32(uint256(1)), EVIDENCE);
        require(_session(id, 2) != claim, "new claim can use capacity");
    }

    function test_PtRejectsUnauthorizedCancellation() public {
        uint256 id = _pt(900);
        uint256 claim = _session(id, 1);
        _reject(OTHER, V.Unauthorized.selector);
        vault.cancelSessionProposal(id, claim);
        _reject(RESOLVER, V.Unauthorized.selector);
        vault.cancelSessionProposal(id, claim);
        require(vault.getAgreement(id).liveClaims == 1, "live claim retained");
    }

    function test_PtRejectsCancellationAfterConfirmationOrChallenge() public {
        uint256 id = _pt(900);
        uint256 confirmed = _session(id, 1);
        _confirm(id, confirmed);
        _reject(BUYER, V.InvalidState.selector);
        vault.cancelSessionProposal(id, confirmed);
        uint256 challenged = _challengeSession(id, 2);
        _reject(GYM, V.InvalidState.selector);
        vault.cancelSessionProposal(id, challenged);
        uint256 other = _session(id, 3);
        VM.prank(GYM);
        vault.cancelSessionProposal(id, other);
        V.Agreement memory a = vault.getAgreement(id);
        require(a.challengedSessionClaimId == challenged && a.disputedLocked == 90, "unrelated dispute preserved");
    }

    function test_PtRejectsRepeatedCancellationAndLateConfirmation() public {
        uint256 id = _pt(900);
        uint256 claim = _session(id, 1);
        VM.prank(GYM);
        vault.cancelSessionProposal(id, claim);
        _reject(GYM, V.InvalidState.selector);
        vault.cancelSessionProposal(id, claim);
        _reject(BUYER, V.InvalidState.selector);
        vault.confirmSession(id, claim);
        _reject(BUYER, V.InvalidState.selector);
        vault.challengeClaim(id, claim, EVIDENCE);
    }

    function test_TerminationRequiresLastLiveClaimToBeCancelled() public {
        uint256 id = _pt(900);
        uint256 claim = _session(id, 1);
        _reject(BUYER, V.LiveClaims.selector);
        vault.proposeTermination(id, 900, EVIDENCE);
        VM.prank(BUYER);
        vault.cancelSessionProposal(id, claim);
        uint256 proposal = _proposeTermination(id, 900);
        _ledger(id, 900, 0, 0, 0, 900);
        VM.prank(GYM);
        vault.acceptTermination(id, proposal);
        _ledger(id, 900, 0, 900, 0, 0);
    }

    function test_TimePastIntervalsAccrueWithoutCheckIns() public {
        uint256 id = _time(900);
        VM.warp(START + 90 * DAY);
        uint256 first = _interval(id, START, START + 30 * DAY);
        uint256 second = _interval(id, START + 30 * DAY, START + 90 * DAY);
        VM.warp(START + 91 * DAY);
        _finalize(id, first);
        require(vault.getClaim(id, first).awardedToGym == 300, "elapsed 30 days");
        _finalize(id, second);
        _ledger(id, 900, 900, 0, 0, 0);
    }

    function test_TimeEvidenceOfZeroOrFifteenVisitsDoesNotAffectEarnings() public {
        uint256 zeroVisits = _time(900);
        uint256 fifteenVisits = _time(900);
        uint64 end = START + 30 * DAY;
        VM.warp(end);
        VM.prank(GYM);
        uint256 zeroClaim = vault.proposeTime(zeroVisits, START, end, keccak256("0 visits"));
        VM.prank(GYM);
        uint256 fifteenClaim = vault.proposeTime(fifteenVisits, START, end, keccak256("15 visits"));
        VM.warp(end + DAY);
        _finalize(zeroVisits, zeroClaim);
        _finalize(fifteenVisits, fifteenClaim);
        _ledger(zeroVisits, 900, 300, 0, 0, 600);
        _ledger(fifteenVisits, 900, 300, 0, 0, 600);
    }

    function test_TimeRejectsFutureAndOverlappingIntervals() public {
        uint256 id = _time(900);
        VM.warp(START + 30 * DAY);
        _reject(GYM, V.InvalidInterval.selector);
        vault.proposeTime(id, START, START + 31 * DAY, EVIDENCE);
        _interval(id, START, START + 30 * DAY);
        _reject(GYM, V.OverlappingInterval.selector);
        vault.proposeTime(id, START + DAY, START + 30 * DAY, EVIDENCE);
    }

    function test_TimeRejectsIntervalsOutsideAgreementAndEmptyIntervals() public {
        uint256 id = _time(900);
        VM.warp(START + 91 * DAY);
        _reject(GYM, V.InvalidInterval.selector);
        vault.proposeTime(id, START - 1, START + DAY, EVIDENCE);
        _reject(GYM, V.InvalidInterval.selector);
        vault.proposeTime(id, START + 89 * DAY, START + 90 * DAY + 1, EVIDENCE);
        _reject(GYM, V.InvalidInterval.selector);
        vault.proposeTime(id, START, START, EVIDENCE);
    }

    function test_TimeChallengeDeadlineEquality() public {
        uint256 id = _time(900);
        VM.warp(START + 30 * DAY);
        uint256 claim = _interval(id, START, START + 30 * DAY);
        VM.warp(START + 31 * DAY - 1);
        _reject(GYM, V.ChallengeWindowOpen.selector);
        vault.finalizeClaim(id, claim);
        VM.warp(START + 31 * DAY);
        _reject(BUYER, V.ChallengeWindowClosed.selector);
        vault.challengeClaim(id, claim, EVIDENCE);
        _finalize(id, claim);
        _reject(GYM, V.OverlappingInterval.selector);
        vault.proposeTime(id, START, START + 30 * DAY, EVIDENCE);
    }

    function test_TimeUnauthorizedActionsAndMissingEvidence() public {
        uint256 id = _time(900);
        uint64 end = START + 30 * DAY;
        VM.warp(end);
        _reject(BUYER, V.Unauthorized.selector);
        vault.proposeTime(id, START, end, EVIDENCE);
        _reject(GYM, V.InvalidInput.selector);
        vault.proposeTime(id, START, end, bytes32(0));
        uint256 claim = _interval(id, START, end);
        _reject(GYM, V.Unauthorized.selector);
        vault.challengeClaim(id, claim, EVIDENCE);
        _reject(BUYER, V.InvalidInput.selector);
        vault.challengeClaim(id, claim, bytes32(0));
        VM.warp(end + DAY);
        _reject(OTHER, V.Unauthorized.selector);
        vault.finalizeClaim(id, claim);
        VM.prank(BUYER);
        vault.finalizeClaim(id, claim);
        _reject(GYM, V.InvalidState.selector);
        vault.finalizeClaim(id, claim);
        _ledger(id, 900, 300, 0, 0, 600);
    }

    function test_TimeChallengePreservesIntervalAndLocksOnlyItsAmount() public {
        uint256 id = _time(900);
        uint64 mid = START + 30 * DAY;
        uint64 end = START + 90 * DAY;
        VM.warp(end);
        uint256 second = _interval(id, mid, end);
        uint256 first = _interval(id, START, mid);
        VM.warp(end + DAY - 1);
        VM.expectEmit(true, true, false, true, address(vault));
        emit V.ClaimChallenged(id, first, EVIDENCE);
        VM.prank(BUYER);
        vault.challengeClaim(id, first, EVIDENCE);
        require(vault.getClaim(id, first).state == V.ClaimState.CHALLENGED, "challenged state");
        _reject(BUYER, V.InvalidState.selector);
        vault.challengeClaim(id, first, EVIDENCE);
        _reject(GYM, V.OverlappingInterval.selector);
        vault.proposeTime(id, START, end, EVIDENCE);
        VM.warp(end + DAY);
        _reject(GYM, V.InvalidState.selector);
        vault.finalizeClaim(id, first);
        _finalize(id, second);
        _ledger(id, 900, 600, 0, 300, 300);
        require(vault.getAgreement(id).liveClaims == 1, "challenged claim stays live");
    }

    function test_TimeZeroValueIntervalPreservesCoverageAndCumulativeRounding() public {
        uint256 id = _time(2);
        uint64 end = START + 90 * DAY;
        VM.warp(end);
        uint256 first = _interval(id, START, START + 30 * DAY);
        uint256 second = _interval(id, START + 30 * DAY, START + 60 * DAY);
        uint256 third = _interval(id, START + 60 * DAY, end);
        require(vault.getClaim(id, first).amount == 0, "round down at 30 days");
        require(vault.getClaim(id, second).amount == 1, "cumulative carry");
        require(vault.getClaim(id, third).amount == 1, "remaining award");
        VM.warp(end + DAY);
        _finalize(id, first);
        _reject(GYM, V.OverlappingInterval.selector);
        vault.proposeTime(id, START, START + 1, EVIDENCE);
        _finalize(id, second);
        _finalize(id, third);
        _ledger(id, 2, 2, 0, 0, 0);
    }

    function test_TimeDisputeSplitAuthorizationReplayAndConservation() public {
        uint256 id = _time(900);
        VM.warp(START + 30 * DAY);
        uint256 claim = _interval(id, START, START + 30 * DAY);
        VM.prank(BUYER);
        vault.challengeClaim(id, claim, EVIDENCE);
        VM.warp(START + 31 * DAY);
        _reject(GYM, V.InvalidState.selector);
        vault.finalizeClaim(id, claim);
        _ledger(id, 900, 0, 0, 300, 900);
        _reject(OTHER, V.Unauthorized.selector);
        vault.resolveClaim(id, claim, 200, 75, DECISION);
        _reject(RESOLVER, V.InsufficientUnallocated.selector);
        vault.resolveClaim(id, claim, 250, 51, DECISION);
        _resolve(id, claim, 200, 75);
        _reject(RESOLVER, V.InvalidState.selector);
        vault.resolveClaim(id, claim, 0, 25, DECISION);
        _payoutBoth(id, 200, 75);
        _ledger(id, 625, 0, 0, 0, 625);
    }

    function test_DisputeIsIsolatedAndPayableFundsRemainAvailable() public {
        uint256 a = _pt(1003);
        uint256 b = _pt(900);
        uint256 earned = _session(a, 1);
        _confirm(a, earned);
        _finalize(a, earned);
        _challengeSession(a, 2);
        uint256 other = _session(b, 1);
        _confirm(b, other);
        _finalize(b, other);
        VM.prank(GYM);
        require(vault.claimEarned(a) == 100, "already payable in disputed agreement");
        VM.prank(GYM);
        require(vault.claimEarned(b) == 90, "other agreement payable");
        require(token.balanceOf(address(vault)) == 1713, "sum locked across agreements");
        _ledger(a, 903, 0, 0, 101, 903);
        _ledger(b, 810, 0, 0, 0, 810);
    }

    function test_RefundRequiresCounterpartyAndCannotBeReplayed() public {
        uint256 id = _pt(900);
        uint256 proposal = _proposeTermination(id, 700);
        _reject(BUYER, V.Unauthorized.selector);
        vault.acceptTermination(id, proposal);
        _reject(BUYER, V.NothingToClaim.selector);
        vault.claimRefund(id);
        VM.prank(GYM);
        vault.acceptTermination(id, proposal);
        _reject(OTHER, V.Unauthorized.selector);
        vault.claimRefund(id);
        VM.prank(BUYER);
        require(vault.claimRefund(id) == 700, "authorized refund");
        _reject(BUYER, V.NothingToClaim.selector);
        vault.claimRefund(id);
        _ledger(id, 200, 0, 0, 0, 200);
    }

    function test_DisputedTerminationRequiresScopedResolverDecision() public {
        uint256 id = _pt(900);
        uint256 proposal = _proposeTermination(id, 600);
        _reject(RESOLVER, V.InvalidState.selector);
        vault.resolveTermination(id, proposal, 650, DECISION);
        VM.prank(GYM);
        vault.disputeTermination(id, proposal, EVIDENCE);
        _reject(OTHER, V.Unauthorized.selector);
        vault.resolveTermination(id, proposal, 650, DECISION);
        VM.prank(RESOLVER);
        vault.resolveTermination(id, proposal, 650, DECISION);
        _ledger(id, 900, 0, 650, 0, 250);
    }

    function test_SupplementalRefundCannotExceedResidual() public {
        uint256 id = _pt(900);
        _terminate(id, 700);
        _reject(BUYER, V.InsufficientUnallocated.selector);
        vault.proposeTermination(id, 201, EVIDENCE);
        _terminate(id, 200);
        require(vault.getAgreement(id).state == V.AgreementState.TERMINATED, "stays terminated");
        _ledger(id, 900, 0, 900, 0, 0);
    }

    function testFuzz_DepositAndAuthorizedRefundConserve(uint16 seed) public {
        uint256 price = uint256(seed) + 1;
        uint256 refund = price / 2;
        uint256 id = _pt(price);
        _terminate(id, refund);
        if (refund > 0) {
            VM.prank(BUYER);
            require(vault.claimRefund(id) == refund, "fuzz authorized refund");
        }
        _ledger(id, price - refund, 0, 0, 0, price - refund);
        require(token.balanceOf(address(vault)) == price - refund, "one agreement backing");
    }

    function test_D17_01_LiveCapacityAndCancellationReplay() public {
        uint256 id = _pt(900);
        VM.expectRevert(V.NotFound.selector);
        vault.getClaim(id, 1);

        for (uint256 n = 1; n <= 10; n++) {
            require(_session(id, n) == n, "sequential claim IDs");
        }
        _confirm(id, 2);
        require(vault.getAgreement(id).liveClaims == 10, "confirmation keeps reservation");
        _reject(GYM, V.SessionLimit.selector);
        vault.proposeSession(id, bytes32(uint256(11)), EVIDENCE);

        _reject(BUYER, V.InvalidState.selector);
        vault.cancelSessionProposal(id, 2);
        VM.prank(GYM);
        vault.cancelSessionProposal(id, 1);
        _reject(GYM, V.InvalidState.selector);
        vault.cancelSessionProposal(id, 1);
        _reject(BUYER, V.InvalidState.selector);
        vault.confirmSession(id, 1);
        _reject(GYM, V.DuplicateSession.selector);
        vault.proposeSession(id, bytes32(uint256(1)), EVIDENCE);

        require(_session(id, 11) == 11, "freed capacity, new claim ID");
        V.Agreement memory a = vault.getAgreement(id);
        require(a.sessionsConsumed == 0 && a.liveClaims == 10, "capacity invariant");
        _ledger(id, 900, 0, 0, 0, 900);
    }

    function test_D17_01_ZeroValueSlotsStillAdvanceHead() public {
        uint256 id = _pt(1);
        for (uint256 n = 1; n <= 10; n++) {
            uint256 claim = _session(id, n);
            _confirm(id, claim);
            _finalize(id, claim);
            V.Claim memory c = vault.getClaim(id, claim);
            require(c.state == V.ClaimState.FINALIZED && c.settledSessionSlot == n, "slot settled");
            require(c.awardedToGym == (n == 10 ? 1 : 0), "exact unit allocation");
            if (n != 10) {
                _reject(GYM, V.NothingToClaim.selector);
                vault.claimEarned(id);
            }
        }
        V.Agreement memory a = vault.getAgreement(id);
        require(a.sessionsFinalized == 10 && a.sessionsConsumed == 10 && a.liveClaims == 0, "all slots used");
        _ledger(id, 1, 1, 0, 0, 0);
    }

    function test_D17_01_EarningsAndWithdrawalsAreAgreementScoped() public {
        uint256 first = _pt(1003);
        uint256 second = _pt(900);
        uint256 claimA = _session(first, 1);
        uint256 claimB = _session(second, 1);
        require(claimA == 1 && claimB == 1, "IDs scoped to agreement");

        _ledger(first, 1003, 0, 0, 0, 1003);
        _confirm(first, claimA);
        _ledger(first, 1003, 0, 0, 0, 1003);
        VM.prank(BUYER);
        vault.finalizeClaim(first, claimA);
        _reject(GYM, V.InvalidState.selector);
        vault.finalizeClaim(first, claimA);
        _ledger(second, 900, 0, 0, 0, 900);

        _confirm(second, claimB);
        _finalize(second, claimB);
        require(vault.getClaim(first, claimA).awardedToGym == 100, "A first award");
        require(vault.getClaim(second, claimB).awardedToGym == 90, "B first award");
        _ledger(first, 1003, 100, 0, 0, 903);
        _ledger(second, 900, 90, 0, 0, 810);

        _reject(BUYER, V.Unauthorized.selector);
        vault.claimEarned(first);
        VM.prank(GYM);
        require(vault.claimEarned(first) == 100, "first agreement payout");
        _ledger(first, 903, 0, 0, 0, 903);
        _ledger(second, 900, 90, 0, 0, 810);
        _reject(GYM, V.NothingToClaim.selector);
        vault.claimEarned(first);

        VM.prank(GYM);
        require(vault.claimEarned(second) == 90, "second agreement payout");
        _reject(GYM, V.NothingToClaim.selector);
        vault.claimEarned(second);
        _ledger(first, 903, 0, 0, 0, 903);
        _ledger(second, 810, 0, 0, 0, 810);
        (uint256 lockedA,,,,) = vault.getBalances(first);
        (uint256 lockedB,,,,) = vault.getBalances(second);
        require(token.balanceOf(GYM) == 190, "exact gym receipts");
        require(token.balanceOf(address(vault)) == lockedA + lockedB, "sum of locked balances");
    }

    function test_D17_01_RejectsZeroSessionIdAndEvidence() public {
        uint256 id = _pt(900);
        bytes32 sessionId = bytes32(uint256(1));

        _reject(GYM, V.InvalidInput.selector);
        vault.proposeSession(id, bytes32(0), EVIDENCE);
        _reject(GYM, V.InvalidInput.selector);
        vault.proposeSession(id, sessionId, bytes32(0));

        require(vault.getAgreement(id).liveClaims == 0, "invalid input keeps capacity");
        require(_session(id, 1) == 1, "invalid input keeps IDs available");
    }

    function test_D17_01_RejectsPtProposalOnTimeAccess() public {
        uint256 id = _time(900);
        _reject(GYM, V.InvalidState.selector);
        vault.proposeSession(id, bytes32(uint256(1)), EVIDENCE);

        require(vault.getAgreement(id).liveClaims == 0, "wrong policy keeps capacity");
        _ledger(id, 900, 0, 0, 0, 900);
    }

    function test_D17_01_RejectsMissingAgreementAndClaimOnWrites() public {
        uint256 id = _pt(900);
        uint256 missingAgreement = id + 1;
        _reject(GYM, V.NotFound.selector);
        vault.proposeSession(missingAgreement, bytes32(uint256(1)), EVIDENCE);
        _reject(BUYER, V.NotFound.selector);
        vault.confirmSession(id, 1);

        require(vault.getAgreement(id).liveClaims == 0, "missing records keep capacity");
    }

    function test_D17_03_PtChallengeAndConfirmationEvents() public {
        uint256 id = _pt(1003);
        uint256 claim = _session(id, 1);
        uint256 second = _session(id, 2);
        _reject(GYM, V.Unauthorized.selector);
        vault.challengeClaim(id, claim, EVIDENCE);
        _reject(BUYER, V.InvalidInput.selector);
        vault.challengeClaim(id, claim, bytes32(0));
        VM.expectEmit(true, true, false, true, address(vault));
        emit V.ClaimChallenged(id, claim, EVIDENCE);
        VM.prank(BUYER);
        vault.challengeClaim(id, claim, EVIDENCE);
        _reject(BUYER, V.SessionAllocationHeld.selector);
        vault.challengeClaim(id, second, EVIDENCE);
        _reject(RESOLVER, V.InvalidInput.selector);
        vault.resolveClaim(id, claim, 1, 0, DECISION);
        _reject(RESOLVER, V.InvalidInput.selector);
        vault.resolveClaim(id, claim, 0, 0, bytes32(0));

        VM.expectEmit(true, true, false, true, address(vault));
        emit V.SessionConfirmed(id, claim);
        VM.expectEmit(true, true, false, true, address(vault));
        emit V.ClaimFinalized(id, claim, 100);
        _confirm(id, claim);
        V.Agreement memory a = vault.getAgreement(id);
        require(a.sessionsFinalized == 1 && a.sessionsConsumed == 1 && a.liveClaims == 1, "PT head counters");
        require(a.challengedSessionClaimId == 0 && a.disputedLocked == 0, "hold released");
        V.Claim memory c = vault.getClaim(id, claim);
        require(c.state == V.ClaimState.FINALIZED && c.settledSessionSlot == 1, "reserved head finalized");
        require(c.reservedGymAmount == 100 && c.reservedRefundAmount == 101, "snapshot retained");
        VM.prank(BUYER);
        vault.challengeClaim(id, second, EVIDENCE);
        VM.expectEmit(true, true, true, true, address(vault));
        emit V.ClaimResolved(id, second, bytes32(uint256(2)), 0, 40, 10, DECISION);
        _resolve(id, second, 0, 40);
        a = vault.getAgreement(id);
        require(a.sessionsFinalized == 1 && a.positiveRefundSlots == 1, "head and tail counters");
        require(a.sessionsConsumed == 2 && a.liveClaims == 0, "capacity conserved");
        require(a.challengedSessionClaimId == 0 && a.disputedLocked == 0, "resolution released hold");
        _ledger(id, 1003, 100, 40, 0, 863);
    }

    function test_D17_03_TimeResolutionReleasesOnlyItsOwnHold() public {
        uint256 id = _time(900);
        uint256 other = _pt(1003);
        VM.warp(START + 60 * DAY);
        uint256 first = _interval(id, START, START + 30 * DAY);
        uint256 second = _interval(id, START + 30 * DAY, START + 60 * DAY);
        VM.prank(BUYER);
        vault.challengeClaim(id, first, EVIDENCE);
        VM.prank(BUYER);
        vault.challengeClaim(id, second, EVIDENCE);
        _ledger(id, 900, 0, 0, 600, 900);
        _reject(RESOLVER, V.InsufficientUnallocated.selector);
        vault.resolveClaim(id, first, 300, 1, DECISION);
        VM.expectEmit(true, true, true, true, address(vault));
        emit V.ClaimResolved(id, first, bytes32(0), 200, 75, 0, DECISION);
        _resolve(id, first, 200, 75);
        _ledger(id, 900, 200, 75, 300, 625);
        require(vault.getAgreement(id).liveClaims == 1, "second claim remains live");

        uint256 buyerBefore = token.balanceOf(BUYER);
        VM.expectEmit(true, true, false, true, address(vault));
        emit V.RefundClaimed(id, BUYER, 75);
        VM.prank(BUYER);
        vault.claimRefund(id);
        require(token.balanceOf(BUYER) == buyerBefore + 75, "buyer receives refund");
        require(token.balanceOf(RESOLVER) == 0, "resolver receives no tokens");
        _reject(BUYER, V.NothingToClaim.selector);
        vault.claimRefund(id);
        _resolve(id, second, 0, 0);
        _reject(GYM, V.OverlappingInterval.selector);
        vault.proposeTime(id, START + 30 * DAY, START + 60 * DAY, EVIDENCE);
        _ledger(id, 825, 200, 0, 0, 625);
        _ledger(other, 1003, 0, 0, 0, 1003);
        require(token.balanceOf(address(vault)) == 1828, "aggregate backing");
    }

    function test_D17_03_TerminationRolesAndTerminalEvents() public {
        uint256 id = _pt(900);
        _reject(OTHER, V.Unauthorized.selector);
        vault.proposeTermination(id, 0, EVIDENCE);
        _reject(BUYER, V.InvalidInput.selector);
        vault.proposeTermination(id, 0, bytes32(0));
        VM.expectEmit(true, true, true, true, address(vault));
        emit V.TerminationProposed(id, 1, BUYER, 400, EVIDENCE);
        uint256 cancelled = _proposeTermination(id, 400);
        _reject(GYM, V.InvalidState.selector);
        vault.proposeSession(id, bytes32(uint256(1)), EVIDENCE);
        _reject(GYM, V.Unauthorized.selector);
        vault.cancelTermination(id, cancelled);
        VM.expectEmit(true, true, false, false, address(vault));
        emit V.TerminationCancelled(id, cancelled);
        VM.prank(BUYER);
        vault.cancelTermination(id, cancelled);
        require(vault.getActiveTerminationId(id) == 0, "cancel cleared active proposal");
        require(vault.getTermination(id, cancelled).state == V.TerminationState.CANCELLED, "cancelled state");

        uint256 first = _proposeTermination(id, 600);
        require(first == cancelled + 1, "ids not reused");
        _reject(BUYER, V.Unauthorized.selector);
        vault.disputeTermination(id, first, EVIDENCE);
        _reject(GYM, V.InvalidInput.selector);
        vault.disputeTermination(id, first, bytes32(0));
        VM.expectEmit(true, true, false, true, address(vault));
        emit V.TerminationDisputed(id, first, EVIDENCE);
        VM.prank(GYM);
        vault.disputeTermination(id, first, EVIDENCE);
        _reject(RESOLVER, V.InvalidInput.selector);
        vault.resolveTermination(id, first, 600, bytes32(0));
        VM.expectEmit(true, true, true, true, address(vault));
        emit V.AgreementTerminated(id, first, RESOLVER, true, 650, DECISION);
        VM.prank(RESOLVER);
        vault.resolveTermination(id, first, 650, DECISION);
        _reject(RESOLVER, V.InvalidState.selector);
        vault.resolveTermination(id, first, 0, DECISION);
        require(vault.getTermination(id, first).state == V.TerminationState.RESOLVED, "resolved state");

        uint256 second = _proposeTermination(id, 250);
        VM.expectEmit(true, true, true, true, address(vault));
        emit V.TerminationRefundAuthorized(id, second, GYM, false, 250, bytes32(0));
        VM.prank(GYM);
        vault.acceptTermination(id, second);
        _reject(GYM, V.InvalidState.selector);
        vault.acceptTermination(id, second);
        require(vault.getActiveTerminationId(id) == 0, "no active proposal");
        require(vault.getAgreement(id).state == V.AgreementState.TERMINATED, "stays closed");
        _ledger(id, 900, 0, 900, 0, 0);
    }

    function test_D17_03_ActiveTimeTerminationBlocksNewIntervals() public {
        uint256 id = _time(900);
        uint256 proposal = _proposeTermination(id, 0);
        VM.warp(START + DAY);
        _reject(GYM, V.InvalidState.selector);
        vault.proposeTime(id, START, START + DAY, EVIDENCE);
        VM.prank(BUYER);
        vault.cancelTermination(id, proposal);
        _interval(id, START, START + DAY);
        _reject(BUYER, V.LiveClaims.selector);
        vault.proposeTermination(id, 0, EVIDENCE);
    }

    function _pt(uint256 price) private returns (uint256) {
        VM.prank(BUYER);
        return vault.openAgreement(GYM, V.Policy.PER_SESSION, price, TERMS, 0, 0, 0);
    }

    function _time(uint256 price) private returns (uint256) {
        VM.prank(BUYER);
        return vault.openAgreement(GYM, V.Policy.TIME_ACCESS, price, TERMS, START, START + 90 * DAY, DAY);
    }

    function _session(uint256 id, uint256 sessionId) private returns (uint256) {
        VM.prank(GYM);
        return vault.proposeSession(id, bytes32(sessionId), EVIDENCE);
    }

    function _challengeSession(uint256 id, uint256 sessionId) private returns (uint256 claim) {
        claim = _session(id, sessionId);
        VM.prank(BUYER);
        vault.challengeClaim(id, claim, EVIDENCE);
    }

    function _interval(uint256 id, uint64 from, uint64 to) private returns (uint256) {
        VM.prank(GYM);
        return vault.proposeTime(id, from, to, EVIDENCE);
    }

    function _confirm(uint256 id, uint256 claim) private {
        VM.prank(BUYER);
        vault.confirmSession(id, claim);
    }

    function _finalize(uint256 id, uint256 claim) private {
        VM.prank(GYM);
        vault.finalizeClaim(id, claim);
    }

    function _resolve(uint256 id, uint256 claim, uint256 gymAward, uint256 buyerAward) private {
        VM.prank(RESOLVER);
        vault.resolveClaim(id, claim, gymAward, buyerAward, DECISION);
    }

    function _proposeTermination(uint256 id, uint256 amount) private returns (uint256) {
        VM.prank(BUYER);
        return vault.proposeTermination(id, amount, EVIDENCE);
    }

    function _terminate(uint256 id, uint256 amount) private {
        uint256 proposal = _proposeTermination(id, amount);
        VM.prank(GYM);
        vault.acceptTermination(id, proposal);
    }

    function _payoutBoth(uint256 id, uint256 earned, uint256 refund) private {
        VM.prank(GYM);
        require(vault.claimEarned(id) == earned, "direct gym payout");
        VM.prank(BUYER);
        require(vault.claimRefund(id) == refund, "direct buyer refund");
    }

    function _reject(address caller, bytes4 selector) private {
        VM.expectRevert(selector);
        VM.prank(caller);
    }

    function _ledger(uint256 id, uint256 locked, uint256 earned, uint256 refund, uint256 disputed, uint256 unallocated)
        private
        view
    {
        (uint256 l, uint256 e, uint256 r, uint256 d, uint256 u) = vault.getBalances(id);
        require(l == locked && e == earned && r == refund && d == disputed && u == unallocated, "ledger");
        V.Agreement memory a = vault.getAgreement(id);
        require(a.deposited == a.gymWithdrawn + a.buyerRefunded + l, "deposit conservation");
        require(a.earnedFinalized + a.refundAuthorized + u == a.deposited, "allocation conservation");
        require(d <= u && token.balanceOf(address(vault)) >= l, "escrow backing");
    }
}
