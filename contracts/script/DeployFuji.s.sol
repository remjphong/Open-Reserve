// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ReserveVault} from "../src/ReserveVault.sol";
import {MockReserveToken} from "../src/mocks/MockReserveToken.sol";

interface FujiDeployVm {
    function getNonce(address account) external view returns (uint64);
    function computeCreateAddress(address deployer, uint256 nonce) external pure returns (address);
    function startBroadcast(address signer) external;
    function stopBroadcast() external;
}

library FujiDemoConfig {
    uint256 internal constant CHAIN_ID = 43113;
    uint64 internal constant DURATION = 270;
    uint64 internal constant WINDOW = 60;
    bytes32 internal constant TERMS = 0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8;
    uint256 internal constant PT_DEPOSIT = 1003;
    uint256 internal constant TIME_DEPOSIT = 900;
    uint256 internal constant BUYER_ALLOCATION = PT_DEPOSIT + TIME_DEPOSIT;
}

contract DeployFuji {
    FujiDeployVm private constant VM = FujiDeployVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actual);
    error InvalidRoles();
    error RoleMatchesPlannedContract();
    error InsufficientMockSupply();
    error DeploymentMismatch();

    function run(address deployer, address buyer, address merchant, address resolver, uint256 initialSupply)
        external
        returns (MockReserveToken token, ReserveVault vault)
    {
        if (block.chainid != FujiDemoConfig.CHAIN_ID) revert WrongChain(block.chainid);
        if (
            deployer == address(0) || buyer == address(0) || merchant == address(0) || resolver == address(0)
                || buyer == merchant || buyer == resolver || merchant == resolver
        ) revert InvalidRoles();
        if (initialSupply < FujiDemoConfig.BUYER_ALLOCATION) revert InsufficientMockSupply();

        uint256 nonce = VM.getNonce(deployer);
        address plannedToken = VM.computeCreateAddress(deployer, nonce);
        address plannedVault = VM.computeCreateAddress(deployer, nonce + 1);
        if (
            buyer == plannedVault || merchant == plannedVault || resolver == plannedVault || buyer == plannedToken
                || merchant == plannedToken || resolver == plannedToken
        ) revert RoleMatchesPlannedContract();

        VM.startBroadcast(deployer);
        token = new MockReserveToken(initialSupply);
        vault = new ReserveVault(address(token), resolver);
        VM.stopBroadcast();

        if (
            address(token) != plannedToken || address(vault) != plannedVault
                || address(token).codehash != keccak256(type(MockReserveToken).runtimeCode)
                || token.totalSupply() != initialSupply || token.balanceOf(deployer) != initialSupply
                || token.decimals() != 18 || vault.token() != address(token) || vault.resolver() != resolver
        ) revert DeploymentMismatch();
        (uint64 duration, uint64 window, bytes32 terms) = vault.timeAccessConfig();
        if (duration != FujiDemoConfig.DURATION || window != FujiDemoConfig.WINDOW || terms != FujiDemoConfig.TERMS) {
            revert DeploymentMismatch();
        }
    }
}
