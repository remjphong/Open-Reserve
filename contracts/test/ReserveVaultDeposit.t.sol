// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {IReserveVault as V} from "../src/IReserveVault.sol";
import {ReserveVault} from "../src/ReserveVault.sol";
import {MockReserveToken} from "../src/mocks/MockReserveToken.sol";
import {Vm} from "./ReserveVault.t.sol";

/// @dev Fixture that sends one unit less than requested, simulating a fee on transfer.
contract ShortReceiptToken is MockReserveToken {
    constructor() MockReserveToken(900) {}

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && value > 0) {
            super._update(from, address(0), 1);
            super._update(from, to, value - 1);
        } else {
            super._update(from, to, value);
        }
    }
}

interface DepositVm is Vm {
    function expectRevert(bytes calldata) external;
}

contract ReserveVaultDepositTest {
    DepositVm private constant VM = DepositVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant BUYER = address(0xB001);
    address private constant GYM = address(0x6001);
    address private constant RESOLVER = address(0xA001);
    bytes32 private constant TERMS = 0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8;

    MockReserveToken private token;
    V private vault;

    function setUp() public {
        VM.chainId(31337);
        token = new MockReserveToken(2_000);
        require(token.transfer(BUYER, 1_000), "fund fixture buyer");
        vault = V(address(new ReserveVault(address(token), RESOLVER)));
    }

    function test_DepositMockTokenAndEmitAgreementOpened() public {
        require(token.decimals() == 18 && token.totalSupply() == 2_000, "mock units");
        require(vault.token() == address(token) && vault.resolver() == RESOLVER, "fixed addresses");
        VM.prank(BUYER);
        token.approve(address(vault), 900);
        VM.expectEmit(true, true, true, true, address(vault));
        emit V.AgreementOpened(1, BUYER, GYM, V.Policy.PER_SESSION, 900, TERMS, 0, 0, 0);
        VM.prank(BUYER);
        uint256 id = vault.openAgreement(GYM, V.Policy.PER_SESSION, 900, TERMS, 0, 0, 0);
        require(id == 1 && vault.getAgreement(id).deposited == 900, "recorded deposit");
        require(token.balanceOf(BUYER) == 100 && token.balanceOf(address(vault)) == 900, "exact transfer");
    }

    function test_DepositRequiresCallerAllowanceAndKeepsSequentialIdOnFailure() public {
        VM.prank(BUYER);
        token.approve(address(vault), 200);
        VM.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(vault), 200, 900)
        );
        VM.prank(BUYER);
        vault.openAgreement(GYM, V.Policy.PER_SESSION, 900, TERMS, 0, 0, 0);
        require(token.balanceOf(BUYER) == 1_000 && token.balanceOf(address(vault)) == 0, "failed deposit atomic");
        VM.expectRevert(V.NotFound.selector);
        vault.getAgreement(1);
        VM.prank(BUYER);
        require(vault.openAgreement(GYM, V.Policy.PER_SESSION, 200, TERMS, 0, 0, 0) == 1, "id reused");
    }

    function test_DepositRejectsResolverAsBuyerOrMerchant() public {
        VM.expectRevert(V.InvalidInput.selector);
        VM.prank(RESOLVER);
        vault.openAgreement(GYM, V.Policy.PER_SESSION, 900, TERMS, 0, 0, 0);
        VM.expectRevert(V.InvalidInput.selector);
        VM.prank(BUYER);
        vault.openAgreement(RESOLVER, V.Policy.PER_SESSION, 900, TERMS, 0, 0, 0);
        require(token.balanceOf(address(vault)) == 0, "no movement");
    }

    function test_DepositShortReceiptRevertsTokenAndAgreementChanges() public {
        ShortReceiptToken shortToken = new ShortReceiptToken();
        V shortVault = V(address(new ReserveVault(address(shortToken), RESOLVER)));
        shortToken.approve(address(shortVault), 900);
        VM.expectRevert(V.UnexpectedTokenReceipt.selector);
        shortVault.openAgreement(GYM, V.Policy.PER_SESSION, 900, TERMS, 0, 0, 0);
        require(shortToken.balanceOf(address(this)) == 900, "buyer restored");
        require(shortToken.balanceOf(address(shortVault)) == 0, "vault restored");
        require(shortToken.allowance(address(this), address(shortVault)) == 900, "allowance restored");
        VM.expectRevert(V.NotFound.selector);
        shortVault.getAgreement(1);
    }

    function test_DepositAcrossTwoAgreementsSeparatesLedgers() public {
        VM.prank(BUYER);
        token.approve(address(vault), 900);
        VM.prank(BUYER);
        uint256 first = vault.openAgreement(GYM, V.Policy.PER_SESSION, 400, TERMS, 0, 0, 0);
        VM.prank(BUYER);
        uint256 second = vault.openAgreement(GYM, V.Policy.PER_SESSION, 500, TERMS, 0, 0, 0);
        (uint256 firstLocked,,,, uint256 firstUnallocated) = vault.getBalances(first);
        (uint256 secondLocked,,,, uint256 secondUnallocated) = vault.getBalances(second);
        require(first == 1 && second == 2 && firstLocked == 400 && secondLocked == 500, "independent ledgers");
        require(firstUnallocated == 400 && secondUnallocated == 500, "no funds allocated at deposit");
        require(token.balanceOf(address(vault)) == firstLocked + secondLocked, "deposit backing");
    }
}
