// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MultiSend} from "./MultiSend.sol";

/**
 * @title MultiSendNative
 * @notice Batch CELO/ETH sender gated by Self verification of the caller.
 */
contract MultiSendNative is MultiSend {
    error NativeTransferFailed();
    error InsufficientMsgValue();

    constructor(
        address hub,
        string memory scopeSeed
    ) MultiSend(hub, scopeSeed) {}

    function batchSendNative(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant onlyVerifiedSender {
        _validateBatchArgs(recipients, amounts);

        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) total += amounts[i];
        if (msg.value < total) revert InsufficientMsgValue();

        for (uint256 i = 0; i < recipients.length; i++) {
            _payout(recipients[i], amounts[i]);
        }

        // refund dust, if any
        uint256 refund = msg.value - total;
        if (refund > 0) {
            (bool ok, ) = payable(msg.sender).call{value: refund}("");
            if (!ok) revert NativeTransferFailed();
        }
    }

    function _payout(address to, uint256 amount) internal override {
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
    }

    // Allow funding via plain ETH transfers (not used by function but helpful in tests)
    receive() external payable {}
}
