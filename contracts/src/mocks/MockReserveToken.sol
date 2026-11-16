// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Fixed-supply token for testnet demos. Supply uses 18-decimal base units.
contract MockReserveToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Mock Reserve Token", "MRES") {
        _mint(msg.sender, initialSupply);
    }
}
