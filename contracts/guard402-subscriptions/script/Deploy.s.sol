// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {Guard402Subscriptions} from "../src/Guard402Subscriptions.sol";

contract DeployGuard402Subscriptions is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);

        Guard402Subscriptions registry = new Guard402Subscriptions(vm.addr(pk));

        vm.stopBroadcast();

        console2.log("Guard402Subscriptions deployed at:", address(registry));
    }
}
