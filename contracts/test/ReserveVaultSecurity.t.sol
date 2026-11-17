// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IReserveVault as V} from "../src/IReserveVault.sol";
import {ReserveVault} from "../src/ReserveVault.sol";
import {MockReserveToken} from "../src/mocks/MockReserveToken.sol";

interface SecurityVm {
    struct Log {
        bytes32[] topics;
        bytes data;
        address emitter;
    }

    function recordLogs() external;
    function getRecordedLogs() external returns (Log[] memory);
    function chainId(uint256 chain) external;
    function warp(uint256 timestamp) external;
    function prank(address actor) external;
    function expectRevert(bytes4 selector) external;
}

contract ReserveVaultSecurityTest {
    SecurityVm private constant VM = SecurityVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant BUYER = address(0xB001);
    address private constant GYM = address(0x6001);
    address private constant RESOLVER = address(0xA001);
    bytes32 private constant TERMS = 0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8;
    bytes32 private constant EVIDENCE = keccak256("audit evidence");
    uint64 private constant WINDOW = 1 days;
    uint64 private constant DURATION = 90 days;

    V private vault;
    MockReserveToken private token;

    function setUp() public {
        VM.chainId(31337);
        VM.prank(BUYER);
        token = new MockReserveToken(type(uint256).max);
        vault = V(address(new ReserveVault(address(token), RESOLVER)));
        VM.prank(BUYER);
        token.approve(address(vault), type(uint256).max);
    }

    function test_D17_05_MaxSupplyTimeSplitRejectsOverflowAndConserves() public {
        uint64 start = 100_000;
        uint256 max = type(uint256).max;
        uint256 id = _open(start, max);
        VM.warp(start + DURATION);
        VM.prank(GYM);
        uint256 claim = vault.proposeTime(id, start, start + DURATION, EVIDENCE);
        VM.prank(BUYER);
        vault.challengeClaim(id, claim, EVIDENCE);
        require(vault.getAgreement(id).disputedLocked == max, "exact maximum hold");
        VM.expectRevert(V.InsufficientUnallocated.selector);
        VM.prank(RESOLVER);
        vault.resolveClaim(id, claim, max, 1, EVIDENCE);
        require(vault.getAgreement(id).disputedLocked == max, "failed split preserved hold");
        require(token.balanceOf(address(vault)) == max, "failed split preserved backing");

        VM.prank(RESOLVER);
        vault.resolveClaim(id, claim, max - 1, 1, EVIDENCE);
        V.Agreement memory a = vault.getAgreement(id);
        require(a.disputedLocked == 0 && a.liveClaims == 0, "hold released once");
        require(a.earnedFinalized == max - 1 && a.refundAuthorized == 1, "exact maximum split");
        VM.prank(GYM);
        require(vault.claimEarned(id) == max - 1, "merchant payout");
        VM.prank(BUYER);
        require(vault.claimRefund(id) == 1, "buyer refund");
        require(token.balanceOf(GYM) == max - 1 && token.balanceOf(BUYER) == 1, "fixed recipients");
        require(token.balanceOf(address(vault)) == 0 && token.balanceOf(RESOLVER) == 0, "no residual payout");
    }

    function test_D17_05_DeadlineCastAtUint64Boundary() public {
        uint64 lastProposal = type(uint64).max - WINDOW;
        uint64 start = lastProposal - DURATION;
        uint256 id = _open(start, 900);
        VM.warp(lastProposal);
        VM.prank(GYM);
        uint256 claim = vault.proposeTime(id, start, start + DURATION / 2, EVIDENCE);
        require(vault.getClaim(id, claim).challengeEndsAt == type(uint64).max, "deadline does not truncate");
        VM.warp(uint256(lastProposal) + 1);
        VM.expectRevert(V.InvalidInput.selector);
        VM.prank(GYM);
        vault.proposeTime(id, start + DURATION / 2, lastProposal, EVIDENCE);
        require(vault.getAgreement(id).liveClaims == 1, "rejection preserves live claims");
        VM.warp(type(uint64).max);
        VM.expectRevert(V.ChallengeWindowClosed.selector);
        VM.prank(BUYER);
        vault.challengeClaim(id, claim, EVIDENCE);
        VM.prank(GYM);
        vault.finalizeClaim(id, claim);
        require(vault.getAgreement(id).earnedFinalized == 450, "finalize exact deadline");
    }

    function test_D17_05_RejectsVaultAsItsOwnMerchant() public {
        VM.expectRevert(V.InvalidInput.selector);
        VM.prank(BUYER);
        vault.openAgreement(address(vault), V.Policy.PER_SESSION, 1, TERMS, 0, 0, 0);
    }

    function test_D17_05_High01RejectionLeavesBalancesLogsAndIdsUnchanged() public {
        uint256 buyerBefore = token.balanceOf(BUYER);
        uint256 vaultBefore = token.balanceOf(address(vault));
        VM.recordLogs();
        VM.expectRevert(V.InvalidInput.selector);
        VM.prank(BUYER);
        vault.openAgreement(address(vault), V.Policy.PER_SESSION, 1, TERMS, 0, 0, 0);
        SecurityVm.Log[] memory logs = VM.getRecordedLogs();
        require(logs.length == 0, "no agreement or transfer event");
        require(token.balanceOf(BUYER) == buyerBefore, "buyer balance unchanged");
        require(token.balanceOf(address(vault)) == vaultBefore, "vault balance unchanged");
        VM.expectRevert(V.NotFound.selector);
        vault.getAgreement(1);

        VM.prank(BUYER);
        uint256 ptId = vault.openAgreement(GYM, V.Policy.PER_SESSION, 10, TERMS, 0, 0, 0);
        require(ptId == 1, "first valid agreement ID");
        require(vault.getAgreement(ptId).policy == V.Policy.PER_SESSION, "valid PT");
        uint256 timeId = _open(100_000, 900);
        require(timeId == 2, "next valid agreement ID");
        require(vault.getAgreement(timeId).policy == V.Policy.TIME_ACCESS, "valid TIME");
        require(token.balanceOf(address(vault)) == vaultBefore + 910, "only valid deposits collected");
    }

    function _open(uint64 start, uint256 amount) private returns (uint256) {
        VM.warp(start);
        VM.prank(BUYER);
        return vault.openAgreement(GYM, V.Policy.TIME_ACCESS, amount, TERMS, start, start + DURATION, WINDOW);
    }
}
