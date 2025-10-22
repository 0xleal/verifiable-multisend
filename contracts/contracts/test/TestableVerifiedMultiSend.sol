// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerifiedMultiSend} from "../src/SelfVerifiedMultiSend.sol";

/**
 * @title TestableVerifiedMultiSend
 * @notice Test version of SelfVerifiedMultiSend - no changes needed, just a wrapper
 */
contract TestableVerifiedMultiSend is SelfVerifiedMultiSend {
    constructor(
        address verificationRegistry
    ) SelfVerifiedMultiSend(verificationRegistry) {}
}
