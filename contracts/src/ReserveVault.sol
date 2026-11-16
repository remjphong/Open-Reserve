// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
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
    mapping(uint256 => V.Agreement) private agreements;

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

    // Later tasks replace this path with the remaining frozen interface functions.
    fallback() external {
        revert VaultBehaviorNotImplemented(msg.sig);
    }
}
