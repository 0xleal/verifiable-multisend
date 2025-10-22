// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerifiedAirdrop} from "../src/SelfVerifiedAirdrop.sol";

/**
 * @title TestableVerifiedAirdrop
 * @notice Test version of SelfVerifiedAirdrop - no changes needed, just a wrapper
 */
contract TestableVerifiedAirdrop is SelfVerifiedAirdrop {
    constructor(
        address verificationRegistry
    ) SelfVerifiedAirdrop(verificationRegistry) {}
}
