// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SomniaProbe} from "../src/SomniaProbe.sol";

/// @notice Deploy the minimal probe to Somnia testnet (chain 50312).
/// @dev Run (after funding the deployer with STT):
///   forge script script/DeploySomniaProbe.s.sol \
///     --rpc-url https://api.infra.testnet.somnia.network --broadcast \
///     --private-key $DEPLOYER_PK
/// Then `export CONSUMER=<printed address>` for the invoke/observe step.
contract DeploySomniaProbe is Script {
    /// @dev Somnia TESTNET JSON API Request platform (NOT the mainnet IAgentRequester).
    address constant SOMNIA_TESTNET_PLATFORM = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;

    function run() external returns (SomniaProbe probe) {
        vm.startBroadcast();
        probe = new SomniaProbe(SOMNIA_TESTNET_PLATFORM);
        vm.stopBroadcast();
        console2.log("SomniaProbe deployed at:", address(probe));
        console2.log("Platform:", SOMNIA_TESTNET_PLATFORM);
    }
}
