// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CeloVerificationRegistry} from "../src/CeloVerificationRegistry.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

/**
 * @title TestableVerificationRegistry
 * @notice Test version of CeloVerificationRegistry with public trigger function
 */
contract TestableVerificationRegistry is CeloVerificationRegistry {
    constructor(
        address hub,
        string memory scopeSeed,
        address mailbox
    ) CeloVerificationRegistry(hub, scopeSeed, mailbox) {}

    /**
     * @notice Public trigger function for testing verification
     * @param userData Test data containing userIdentifier
     */
    function trigger(bytes memory userData) external {
        // userData format in tests: | 32 bytes destChainId | 32 bytes userIdentifier | data |
        bytes32 userIdentifierBytes;
        assembly {
            userIdentifierBytes := mload(add(userData, 64))
        }

        ISelfVerificationRoot.GenericDiscloseOutputV2 memory out;
        out.userIdentifier = uint256(userIdentifierBytes);
        out.nullifier = uint256(keccak256(userData));

        customVerificationHook(out, userData);
    }
}
