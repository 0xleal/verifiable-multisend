// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {Claim} from "./Claim.sol";

/**
 * @title ClaimToken
 * @notice ERC20-based claim distribution inheriting Self-gated base logic.
 */
contract ClaimToken is Claim {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    constructor(
        address identityVerificationHubAddress,
        string memory scopeSeed,
        address tokenAddress
    ) Claim(identityVerificationHubAddress, scopeSeed) {
        token = IERC20(tokenAddress);
    }

    function _payout(address to, uint256 amount) internal override {
        token.safeTransfer(to, amount);
    }
}
