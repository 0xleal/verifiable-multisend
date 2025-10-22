// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerifiedMultiSend} from "../src/SelfVerifiedMultiSend.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

contract TestableVerifiedMultiSend is SelfVerifiedMultiSend {
    constructor(
        address hub,
        uint256 scopeSeed
    ) SelfVerifiedMultiSend(hub, scopeSeed) {}

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
