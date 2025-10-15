// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MultiSendSelfGuarded} from "../src/MultiSendSelfGuarded.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

contract TestableMultiSendSelfGuarded is MultiSendSelfGuarded {
    constructor(
        address hub,
        string memory scopeSeed,
        bytes32 humanOnlyConfigId
    ) MultiSendSelfGuarded(hub, scopeSeed, humanOnlyConfigId) {}

    function trigger(bytes memory userData) external {
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory dummy;
        customVerificationHook(dummy, userData);
    }
}
