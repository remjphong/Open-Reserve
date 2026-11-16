// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @dev D16-05 deployment placeholder. D16-06 replaces it with the implementation.
contract ReserveVault {
    error VaultBehaviorNotImplemented(bytes4 selector);

    constructor(address, address) {}

    fallback() external {
        revert VaultBehaviorNotImplemented(msg.sig);
    }
}
