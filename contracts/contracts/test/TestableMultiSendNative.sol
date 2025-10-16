// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MultiSendNative} from "../src/MultiSendNative.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

contract TestableMultiSendNative is MultiSendNative {
    constructor(
        address hub,
        string memory scopeSeed
    ) MultiSendNative(hub, scopeSeed) {}

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
