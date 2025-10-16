// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {MultiSend} from "./MultiSend.sol";

/**
 * @title MultiSendToken
 * @notice Batch ERC20 sender gated by Self verification of the caller.
 */
contract MultiSendToken is MultiSend {
    using SafeERC20 for IERC20;

    constructor(
        address hub,
        string memory scopeSeed
    ) MultiSend(hub, scopeSeed) {}

    function batchSendERC20(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant onlyVerifiedSender {
        _validateBatchArgs(recipients, amounts);

        IERC20 erc20 = IERC20(token);

        // Pull once per recipient from sender to avoid large allowances lingering
        for (uint256 i = 0; i < recipients.length; i++) {
            erc20.safeTransferFrom(msg.sender, recipients[i], amounts[i]);
        }
    }

    function _payout(address to, uint256 amount) internal pure override {
        // Unused in token path; present to satisfy abstract base
        to;
        amount; // silence compiler warnings
    }
}
