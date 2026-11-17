// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IReserveVault as V} from "../src/IReserveVault.sol";
import {ReserveVault} from "../src/ReserveVault.sol";

interface InvariantVm {
    function chainId(uint256 chain) external;
    function warp(uint256 timestamp) external;
    function prank(address actor) external;
}

contract InvariantToken is ERC20 {
    constructor(address buyer) ERC20("Invariant fixture", "IVT") {
        _mint(buyer, 1_000_000);
    }
}

contract ReserveVaultInvariantTest {
    InvariantVm private constant VM = InvariantVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant BUYER = address(0xB001);
    address private constant GYM = address(0x6001);
    address private constant RESOLVER = address(0xA001);
    address private constant OTHER = address(0xF001);
    bytes32 private constant TERMS = 0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8;
    bytes32 private constant EVIDENCE = keccak256("invariant evidence");
    bytes32 private constant DECISION = keccak256("invariant decision");
    uint64 private constant START = 100_000;

    V private vault;
    InvariantToken private token;
    uint256 private agreements;
    mapping(uint256 => uint256) private claims;
    mapping(uint256 => uint256) private terminations;

    function testFuzz_D17_04_PtSequences(uint16 rawPrice, uint32 actions, uint16 awardSeed) public {
        _boot(31337);
        uint256 price = 1 + uint256(rawPrice) % 2048;
        uint256 a = _open(price, false, 0, 0);
        uint256 b = _open(1003, false, 0, 0);

        uint256 cancelled = _session(a, 1);
        _write(BUYER, abi.encodeCall(V.cancelSessionProposal, (a, cancelled)));
        _reverts(GYM, abi.encodeCall(V.proposeSession, (a, bytes32(uint256(1)), EVIDENCE)), V.DuplicateSession.selector);

        uint256 held = _session(a, 2);
        _challenge(a, held);
        _reverts(OTHER, abi.encodeCall(V.resolveClaim, (a, held, 0, 0, DECISION)), V.Unauthorized.selector);

        // The other agreement settles and pays out while A still holds its dispute.
        uint256 other = _session(b, 1);
        _write(BUYER, abi.encodeCall(V.confirmSession, (b, other)));
        _write(GYM, abi.encodeCall(V.finalizeClaim, (b, other)));
        _withdraw(b, false, 100);
        require(vault.getAgreement(a).challengedSessionClaimId == held, "I8 other payout changed hold");
        _resolve(a, held, 0, 0);
        _reverts(GYM, abi.encodeCall(V.proposeSession, (a, bytes32(uint256(2)), EVIDENCE)), V.DuplicateSession.selector);

        uint256 head;
        uint256 tail;
        for (uint256 i; i < 9; ++i) {
            uint256 claim = _session(a, i + 3);
            uint256 choice = (uint256(actions) >> (2 * i)) & 3;
            if (choice == 0) {
                _write(BUYER, abi.encodeCall(V.confirmSession, (a, claim)));
                _write(GYM, abi.encodeCall(V.finalizeClaim, (a, claim)));
                require(vault.getClaim(a, claim).awardedToGym == _slot(price, ++head), "I9 ordinary head");
            } else {
                _challenge(a, claim);
                if (choice == 1) {
                    _write(BUYER, abi.encodeCall(V.confirmSession, (a, claim)));
                    require(vault.getClaim(a, claim).awardedToGym == _slot(price, ++head), "I9 challenged head");
                } else {
                    uint256 budget = _slot(price, 10 - tail);
                    uint256 award = choice == 2 ? 0 : (uint256(awardSeed) + i) % (budget + 1);
                    _reverts(
                        RESOLVER,
                        abi.encodeCall(V.resolveClaim, (a, claim, 0, budget + 1, DECISION)),
                        V.InsufficientUnallocated.selector
                    );
                    _resolve(a, claim, 0, award);
                    V.Claim memory decided = vault.getClaim(a, claim);
                    require(decided.awardedToBuyer == award, "I6 PT refund amount");
                    require(decided.settledSessionSlot == (award == 0 ? 0 : 10 - tail), "I9 tail rounding");
                    if (award != 0) ++tail;
                }
            }
            V.Agreement memory agreement = vault.getAgreement(a);
            require(agreement.sessionsFinalized == head && agreement.positiveRefundSlots == tail, "PT slot oracle");
        }
        _closeAndWithdraw(a);
    }

    function testFuzz_D17_04_LastSlotRace(uint16 rawPrice, bool confirmFirst) public {
        _boot(31337);
        uint256 price = 1 + uint256(rawPrice) % 2048;
        uint256 id = _open(price, false, 0, 0);
        _open(1, false, 0, 0);
        for (uint256 i = 1; i < 10; ++i) {
            uint256 claim = _session(id, i);
            _write(BUYER, abi.encodeCall(V.confirmSession, (id, claim)));
            _write(GYM, abi.encodeCall(V.finalizeClaim, (id, claim)));
            require(vault.getClaim(id, claim).awardedToGym == _slot(price, i), "I9 head budget");
        }
        uint256 last = _session(id, 10);
        _challenge(id, last);
        uint256 award = _slot(price, 10);
        if (confirmFirst) {
            _write(BUYER, abi.encodeCall(V.confirmSession, (id, last)));
            _reverts(RESOLVER, abi.encodeCall(V.resolveClaim, (id, last, 0, award, DECISION)), V.InvalidState.selector);
        } else {
            _resolve(id, last, 0, award);
            _reverts(BUYER, abi.encodeCall(V.confirmSession, (id, last)), V.InvalidState.selector);
        }
        V.Agreement memory a = vault.getAgreement(id);
        require(a.sessionsConsumed == 10 && a.earnedFinalized + a.refundAuthorized == price, "I6 last slot");
        _closeAndWithdraw(id);
    }

    function testFuzz_D17_04_TimeLocal(uint16 rawPrice, uint16 split) public {
        _timeScenario(31337, 90 days, 1 days, rawPrice, split);
    }

    function testFuzz_D17_04_TimeFujiProfile(uint16 rawPrice, uint16 split) public {
        _timeScenario(43113, 270, 60, rawPrice, split);
    }

    struct TimeScenario {
        uint256 price;
        uint256 a;
        uint256 b;
        uint64 one;
        uint64 two;
        uint64 end;
        uint256 first;
        uint256 second;
        uint256 finalA;
        uint256 finalB;
        uint256 firstBudget;
        uint256 secondBudget;
    }

    function _timeScenario(uint256 chain, uint64 duration, uint64 window, uint16 rawPrice, uint16 split) private {
        _boot(chain);
        (uint64 configuredDuration, uint64 configuredWindow, bytes32 termsHash) = vault.timeAccessConfig();
        require(configuredDuration == duration && configuredWindow == window && termsHash == TERMS, "I9 profile");

        TimeScenario memory t;
        t.price = 1 + uint256(rawPrice) % 2048;
        t.a = _open(t.price, true, duration, window);
        t.b = _open(t.price, true, duration, window);
        t.one = START + duration / 3;
        t.two = START + 2 * duration / 3;
        t.end = START + duration;
        VM.warp(t.end - 1);
        _reverts(GYM, abi.encodeCall(V.proposeTime, (t.a, t.two, t.end, EVIDENCE)), V.InvalidInterval.selector);
        VM.warp(t.end);

        t.first = _interval(t.a, START, t.one, EVIDENCE);
        t.second = _interval(t.a, t.one, t.two, EVIDENCE);
        t.finalA = _interval(t.a, t.two, t.end, keccak256("zero check-ins"));
        t.finalB = _interval(t.b, t.two, t.end, keccak256("fifteen check-ins"));
        _reverts(GYM, abi.encodeCall(V.proposeTime, (t.a, t.one - 1, t.two, EVIDENCE)), V.OverlappingInterval.selector);
        _challenge(t.a, t.first);
        _challenge(t.a, t.second);
        t.firstBudget = t.price / 3;
        t.secondBudget = 2 * t.price / 3 - t.firstBudget;
        require(vault.getClaim(t.a, t.first).amount == t.firstBudget, "I9 first interval budget");
        require(vault.getClaim(t.a, t.second).amount == t.secondBudget, "I9 second interval budget");
        require(
            t.firstBudget + t.secondBudget + vault.getClaim(t.a, t.finalA).amount == t.price,
            "I9 full interval partition"
        );
        require(vault.getAgreement(t.a).disputedLocked == t.firstBudget + t.secondBudget, "two simultaneous holds");
        _reverts(
            RESOLVER,
            abi.encodeCall(V.resolveClaim, (t.a, t.first, t.firstBudget, 1, DECISION)),
            V.InsufficientUnallocated.selector
        );
        uint256 gym = uint256(split) % (t.firstBudget + 1);
        uint256 refund = (uint256(split) / 3) % (t.firstBudget - gym + 1);
        _resolve(t.a, t.first, gym, refund);
        require(vault.getAgreement(t.a).disputedLocked == t.secondBudget, "I8 only own hold released");
        _withdraw(t.a, true, refund);
        _reverts(RESOLVER, abi.encodeCall(V.resolveClaim, (t.a, t.first, 0, 0, DECISION)), V.InvalidState.selector);

        VM.warp(t.end + window - 1);
        _reverts(GYM, abi.encodeCall(V.finalizeClaim, (t.b, t.finalB)), V.ChallengeWindowOpen.selector);
        VM.warp(t.end + window);
        _reverts(BUYER, abi.encodeCall(V.challengeClaim, (t.b, t.finalB, EVIDENCE)), V.ChallengeWindowClosed.selector);
        _write(GYM, abi.encodeCall(V.finalizeClaim, (t.b, t.finalB)));
        _write(GYM, abi.encodeCall(V.finalizeClaim, (t.a, t.finalA)));
        uint256 lastBudget = t.price - 2 * t.price / 3;
        require(vault.getClaim(t.a, t.finalA).awardedToGym == lastBudget, "I9 exact TIME rounding");
        require(vault.getClaim(t.b, t.finalB).awardedToGym == lastBudget, "I5 check-in independent");
        _withdraw(t.b, false, lastBudget);
        require(vault.getAgreement(t.a).disputedLocked == t.secondBudget, "I8 TIME isolation");
        _resolve(t.a, t.second, 0, 0);
        _reverts(GYM, abi.encodeCall(V.proposeTime, (t.a, t.one, t.two, EVIDENCE)), V.OverlappingInterval.selector);
        _closeAndWithdraw(t.a);
    }

    function _boot(uint256 chain) private {
        VM.chainId(chain);
        VM.warp(START);
        token = new InvariantToken(BUYER);
        vault = V(address(new ReserveVault(address(token), RESOLVER)));
        VM.prank(BUYER);
        token.approve(address(vault), type(uint256).max);
    }

    function _open(uint256 price, bool isTime, uint64 duration, uint64 window) private returns (uint256 id) {
        VM.prank(BUYER);
        id = vault.openAgreement(
            GYM,
            isTime ? V.Policy.TIME_ACCESS : V.Policy.PER_SESSION,
            price,
            TERMS,
            isTime ? START : 0,
            isTime ? START + duration : 0,
            window
        );
        require(id == ++agreements, "agreement order");
        _checkBalances();
    }

    function _session(uint256 id, uint256 session) private returns (uint256 claim) {
        VM.prank(GYM);
        claim = vault.proposeSession(id, bytes32(session), EVIDENCE);
        require(claim == ++claims[id], "claim order");
        _checkBalances();
    }

    function _interval(uint256 id, uint64 from, uint64 to, bytes32 evidence) private returns (uint256 claim) {
        VM.prank(GYM);
        claim = vault.proposeTime(id, from, to, evidence);
        require(claim == ++claims[id], "claim order");
        _checkBalances();
    }

    function _challenge(uint256 id, uint256 claim) private {
        _write(BUYER, abi.encodeCall(V.challengeClaim, (id, claim, EVIDENCE)));
    }

    function _resolve(uint256 id, uint256 claim, uint256 gym, uint256 refund) private {
        _write(RESOLVER, abi.encodeCall(V.resolveClaim, (id, claim, gym, refund, DECISION)));
    }

    function _closeAndWithdraw(uint256 id) private {
        V.Agreement memory before = vault.getAgreement(id);
        uint256 residual = before.deposited - before.earnedFinalized - before.refundAuthorized;
        uint256 first = _terminate(id, residual / 2);
        _reverts(GYM, abi.encodeCall(V.acceptTermination, (id, first)), V.InvalidState.selector);
        if (residual != 0) _terminate(id, residual - residual / 2);
        V.Agreement memory afterClose = vault.getAgreement(id);
        require(afterClose.state == V.AgreementState.TERMINATED, "supplement does not reopen");
        require(afterClose.refundAuthorized == before.refundAuthorized + residual, "I6 exact residual allocation");
        _withdraw(id, false, afterClose.earnedFinalized - afterClose.gymWithdrawn);
        _withdraw(id, true, afterClose.refundAuthorized - afterClose.buyerRefunded);
        (uint256 locked,,,,) = vault.getBalances(id);
        require(locked == 0, "I1 closed and fully collected");
    }

    function _terminate(uint256 id, uint256 refund) private returns (uint256 proposal) {
        VM.prank(BUYER);
        proposal = vault.proposeTermination(id, refund, EVIDENCE);
        require(proposal == ++terminations[id], "proposal order");
        _checkBalances();
        _reverts(BUYER, abi.encodeCall(V.acceptTermination, (id, proposal)), V.Unauthorized.selector);
        _write(GYM, abi.encodeCall(V.acceptTermination, (id, proposal)));
    }

    function _withdraw(uint256 id, bool refund, uint256 amount) private {
        bytes memory callData = refund ? abi.encodeCall(V.claimRefund, (id)) : abi.encodeCall(V.claimEarned, (id));
        address recipient = refund ? BUYER : GYM;
        address otherParty = refund ? GYM : BUYER;
        _reverts(OTHER, callData, V.Unauthorized.selector);
        if (amount != 0) {
            uint256 before = token.balanceOf(recipient);
            uint256 otherBefore = token.balanceOf(otherParty);
            uint256 vaultBefore = token.balanceOf(address(vault));
            require(abi.decode(_write(recipient, callData), (uint256)) == amount, "I3 payout return");
            require(token.balanceOf(recipient) == before + amount, "I7/I10 fixed recipient");
            require(token.balanceOf(otherParty) == otherBefore, "I7 wrong recipient");
            require(token.balanceOf(address(vault)) == vaultBefore - amount, "I1 vault debit");
        }
        _reverts(recipient, callData, V.NothingToClaim.selector);
    }

    function _write(address actor, bytes memory callData) private returns (bytes memory result) {
        VM.prank(actor);
        (bool ok, bytes memory response) = address(vault).call(callData);
        if (!ok) {
            assembly ("memory-safe") {
                revert(add(response, 0x20), mload(response))
            }
        }
        _checkBalances();
        return response;
    }

    function _reverts(address actor, bytes memory callData, bytes4 selector) private {
        bytes32 before = _snapshot();
        VM.prank(actor);
        (bool ok, bytes memory response) = address(vault).call(callData);
        require(!ok && response.length >= 4 && bytes4(response) == selector, "wrong revert");
        require(_snapshot() == before, "rejected write changed state or balances");
        _checkBalances();
    }

    function _snapshot() private view returns (bytes32 digest) {
        digest = keccak256(
            abi.encode(
                token.balanceOf(address(vault)),
                token.balanceOf(BUYER),
                token.balanceOf(GYM),
                token.balanceOf(RESOLVER),
                token.balanceOf(OTHER)
            )
        );
        for (uint256 id = 1; id <= agreements; ++id) {
            digest = keccak256(abi.encode(digest, vault.getAgreement(id), vault.getActiveTerminationId(id)));
            for (uint256 c = 1; c <= claims[id]; ++c) {
                digest = keccak256(abi.encode(digest, vault.getClaim(id, c)));
            }
            for (uint256 p = 1; p <= terminations[id]; ++p) {
                digest = keccak256(abi.encode(digest, vault.getTermination(id, p)));
            }
        }
    }

    function _checkBalances() private view {
        uint256 totalLocked;
        for (uint256 id = 1; id <= agreements; ++id) {
            V.Agreement memory a = vault.getAgreement(id);
            (uint256 locked, uint256 earned, uint256 refund, uint256 disputed, uint256 free) = vault.getBalances(id);
            require(a.deposited == a.gymWithdrawn + a.buyerRefunded + locked, "I1 conservation");
            require(a.gymWithdrawn <= a.earnedFinalized && earned == a.earnedFinalized - a.gymWithdrawn, "I3 gym");
            require(a.buyerRefunded <= a.refundAuthorized && refund == a.refundAuthorized - a.buyerRefunded, "I3 buyer");
            require(a.earnedFinalized + a.refundAuthorized + free == a.deposited, "I6 allocation");
            require(disputed == a.disputedLocked && disputed <= free, "I6 hold");
            if (a.policy == V.Policy.PER_SESSION) {
                require(a.sessionsConsumed == a.sessionsFinalized + a.positiveRefundSlots, "PT consumed");
                require(uint256(a.sessionsConsumed) + a.liveClaims <= 10, "PT capacity");
            } else {
                require(
                    a.sessionsFinalized == 0 && a.positiveRefundSlots == 0 && a.sessionsConsumed == 0
                        && a.challengedSessionClaimId == 0,
                    "TIME PT-only state"
                );
            }
            totalLocked += locked;
        }
        require(token.balanceOf(address(vault)) >= totalLocked, "I2 aggregate backing");
        require(token.balanceOf(OTHER) == 0 && token.balanceOf(RESOLVER) == 0, "I7 outsider payment");
    }

    function _slot(uint256 price, uint256 slot) private pure returns (uint256) {
        return price * slot / 10 - price * (slot - 1) / 10;
    }
}
