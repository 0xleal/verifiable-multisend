// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ClaimDropSelf} from "../src/ClaimDropSelf.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

contract TestableClaimDropSelf is ClaimDropSelf {
    constructor(
        address hub,
        string memory scopeSeed
    ) ClaimDropSelf(hub, scopeSeed) {}

    function trigger(bytes memory userData) external {
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory dummy;
        customVerificationHook(dummy, userData);
    }
}
