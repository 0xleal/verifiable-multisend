// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ClaimNative} from "../src/ClaimNative.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

contract TestableClaimNative is ClaimNative {
    constructor(
        address hub,
        string memory scopeSeed
    ) ClaimNative(hub, scopeSeed) {}

    function trigger(bytes memory userData) external {
        // userData format used in tests: | 32 bytes destChainId | 32 bytes userIdentifier | data |
        // Extract the 2nd word as userIdentifier
        bytes32 userIdentifierBytes;
        assembly {
            userIdentifierBytes := mload(add(userData, 64))
        }

        ISelfVerificationRoot.GenericDiscloseOutputV2 memory out;
        out.userIdentifier = uint256(userIdentifierBytes);
        // Provide a non-zero unique-ish nullifier per invocation
        out.nullifier = uint256(keccak256(userData));

        customVerificationHook(out, userData);
    }
}
