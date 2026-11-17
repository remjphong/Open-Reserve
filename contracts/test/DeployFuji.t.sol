// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {DeployFuji, FujiDemoConfig} from "../script/DeployFuji.s.sol";
import {ReserveVault} from "../src/ReserveVault.sol";
import {MockReserveToken} from "../src/mocks/MockReserveToken.sol";
import {IReserveVault as V} from "../src/IReserveVault.sol";

interface FujiTestVm {
    function chainId(uint256 chain) external;
    function warp(uint256 timestamp) external;
    function prank(address actor) external;
    function expectRevert(bytes calldata reason) external;
    function expectRevert(bytes4 selector) external;
    function getNonce(address account) external view returns (uint64);
    function computeCreateAddress(address deployer, uint256 nonce) external pure returns (address);
}

contract DeployFujiTest {
    FujiTestVm private constant VM = FujiTestVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant DEPLOYER = address(0xD001);
    address private constant BUYER = address(0xB001);
    address private constant MERCHANT = address(0x6001);
    address private constant RESOLVER = address(0xA001);
    uint256 private constant SUPPLY = 10_000;
    bytes32 private constant EVIDENCE = keccak256("D17-06 local evidence");
    DeployFuji private deploy;

    function setUp() public {
        VM.chainId(43113);
        deploy = new DeployFuji();
    }

    function test_FujiDryRunRejectsLocalAndMainnet() public {
        VM.chainId(31337);
        VM.expectRevert(abi.encodeWithSelector(DeployFuji.WrongChain.selector, 31337));
        deploy.run(DEPLOYER, BUYER, MERCHANT, RESOLVER, SUPPLY);
        VM.chainId(43114);
        VM.expectRevert(abi.encodeWithSelector(DeployFuji.WrongChain.selector, 43114));
        deploy.run(DEPLOYER, BUYER, MERCHANT, RESOLVER, SUPPLY);
    }

    function test_FujiDryRunRejectsZeroAndDuplicateWallets() public {
        VM.expectRevert(DeployFuji.InvalidRoles.selector);
        deploy.run(DEPLOYER, address(0), MERCHANT, RESOLVER, SUPPLY);
        VM.expectRevert(DeployFuji.InvalidRoles.selector);
        deploy.run(DEPLOYER, BUYER, address(0), RESOLVER, SUPPLY);
        VM.expectRevert(DeployFuji.InvalidRoles.selector);
        deploy.run(DEPLOYER, BUYER, MERCHANT, address(0), SUPPLY);
        VM.expectRevert(DeployFuji.InvalidRoles.selector);
        deploy.run(DEPLOYER, BUYER, BUYER, RESOLVER, SUPPLY);
        VM.expectRevert(DeployFuji.InvalidRoles.selector);
        deploy.run(DEPLOYER, BUYER, MERCHANT, BUYER, SUPPLY);
        VM.expectRevert(DeployFuji.InvalidRoles.selector);
        deploy.run(DEPLOYER, BUYER, MERCHANT, MERCHANT, SUPPLY);
    }

    function test_FujiDryRunRejectsMerchantAtPlannedVaultBeforeCreation() public {
        uint64 nonce = VM.getNonce(DEPLOYER);
        address planned = VM.computeCreateAddress(DEPLOYER, uint256(nonce) + 1);
        VM.expectRevert(DeployFuji.RoleMatchesPlannedContract.selector);
        deploy.run(DEPLOYER, BUYER, planned, RESOLVER, SUPPLY);
        require(VM.getNonce(DEPLOYER) == nonce && planned.code.length == 0, "deployment not started");
    }

    function test_FujiDryRunRequiresExplicitSufficientMockSupply() public {
        VM.expectRevert(DeployFuji.InsufficientMockSupply.selector);
        deploy.run(DEPLOYER, BUYER, MERCHANT, RESOLVER, 0);
        VM.expectRevert(DeployFuji.InsufficientMockSupply.selector);
        deploy.run(DEPLOYER, BUYER, MERCHANT, RESOLVER, FujiDemoConfig.BUYER_ALLOCATION - 1);
    }

    function test_FujiDryRunDeploysAndRehearsesDemoWithoutNetwork() public {
        (MockReserveToken token, ReserveVault deployed) = deploy.run(DEPLOYER, BUYER, MERCHANT, RESOLVER, SUPPLY);
        V vault = V(address(deployed));
        require(vault.token() == address(token) && vault.resolver() == RESOLVER, "constructor identity");
        require(token.totalSupply() == SUPPLY && token.balanceOf(DEPLOYER) == SUPPLY, "supply");
        (uint64 duration, uint64 window, bytes32 terms) = vault.timeAccessConfig();
        require(duration == 270 && window == 60 && terms == FujiDemoConfig.TERMS, "Fuji profile");

        VM.prank(DEPLOYER);
        require(token.transfer(BUYER, FujiDemoConfig.BUYER_ALLOCATION), "allocate mock units");
        VM.prank(BUYER);
        require(token.approve(address(vault), FujiDemoConfig.BUYER_ALLOCATION), "approve exact units");
        VM.prank(BUYER);
        uint256 pt = vault.openAgreement(MERCHANT, V.Policy.PER_SESSION, FujiDemoConfig.PT_DEPOSIT, terms, 0, 0, 0);
        uint64 start = 1000;
        VM.warp(start);
        VM.prank(BUYER);
        uint256 time = vault.openAgreement(
            MERCHANT, V.Policy.TIME_ACCESS, FujiDemoConfig.TIME_DEPOSIT, terms, start, start + duration, window
        );
        require(pt == 1 && time == 2 && token.allowance(BUYER, address(vault)) == 0, "exact seed deposits");
        require(token.balanceOf(address(vault)) == FujiDemoConfig.BUYER_ALLOCATION, "vault backing");

        VM.warp(start + 90);
        VM.prank(MERCHANT);
        uint256 claim = vault.proposeTime(time, start, start + 90, EVIDENCE);
        VM.prank(BUYER);
        vault.challengeClaim(time, claim, EVIDENCE);
        VM.prank(RESOLVER);
        vault.resolveClaim(time, claim, 200, 75, EVIDENCE);
        V.Agreement memory settled = vault.getAgreement(time);
        require(settled.earnedFinalized == 200 && settled.refundAuthorized == 75, "bounded split");
        require(settled.disputedLocked == 0 && settled.liveClaims == 0, "hold released");
        require(vault.getAgreement(pt).deposited == FujiDemoConfig.PT_DEPOSIT, "PT isolated");
        require(token.balanceOf(address(vault)) == FujiDemoConfig.BUYER_ALLOCATION, "still backed");
    }
}
