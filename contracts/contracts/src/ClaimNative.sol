// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Claim} from "./Claim.sol";

/**
 * @title ClaimNative
 * @notice Native-asset claim distribution inheriting Self-gated base logic.
 */
contract ClaimNative is Claim {
    constructor(
        address identityVerificationHubAddress,
        string memory scopeSeed
    ) Claim(identityVerificationHubAddress, scopeSeed) {}

    function _payout(address to, uint256 amount) internal override {
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
    }

    // Allow funding via plain ETH transfers
    receive() external payable {}
}
