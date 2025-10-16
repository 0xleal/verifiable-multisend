// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

/**
 * @title MultiSend (Base)
 * @notice Base contract for Self-gated multisend flows. Child contracts implement concrete transfer logic.
 */
abstract contract MultiSend is SelfVerificationRoot, Ownable, ReentrancyGuard {
    // ====================================================
    // Storage
    // ====================================================

    /// @notice Verification config ID used to check sender identity (e-passport/EU ID)
    bytes32 public verificationConfigId;

    // ====================================================
    // Errors
    // ====================================================
    error NotVerified(address unverifiedAddress);
    error LengthMismatch();
    error ZeroRecipient();

    // ====================================================
    // Constructor
    // ====================================================

    constructor(
        address identityVerificationHubAddress,
        string memory scopeSeed
    )
        SelfVerificationRoot(identityVerificationHubAddress, scopeSeed)
        Ownable(_msgSender())
    {}

    // ====================================================
    // Admin
    // ====================================================

    function setConfigId(bytes32 configId) external onlyOwner {
        verificationConfigId = configId;
    }

    // ====================================================
    // Views (Self hook integration)
    // ====================================================

    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    // ====================================================
    // Sender verification helpers
    // ====================================================

    /// @dev Tracks successful verifications by userIdentifier (derived from address in tests/app)
    mapping(uint256 userIdentifier => bool verified)
        internal _verifiedUserIdentifiers;
    mapping(uint256 nullifier => bool used) internal _usedNullifiers;

    /// @notice Returns true if `user` has passed Self verification at least once for this contract scope.
    function isVerified(address user) public view returns (bool) {
        return _verifiedUserIdentifiers[uint256(uint160(user))];
    }

    /// @dev Ensures `msg.sender` has verified; children should call before performing transfers
    modifier onlyVerifiedSender() {
        if (!isVerified(msg.sender)) revert NotVerified(msg.sender);
        _;
    }

    // ====================================================
    // Self Verification Hook
    // ====================================================

    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /* userData */
    ) internal override {
        if (_usedNullifiers[output.nullifier]) revert();
        if (output.userIdentifier == 0) revert();
        _usedNullifiers[output.nullifier] = true;
        _verifiedUserIdentifiers[output.userIdentifier] = true;
    }

    // ====================================================
    // Internal utils
    // ====================================================

    function _validateBatchArgs(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) internal pure {
        if (recipients.length != amounts.length) revert LengthMismatch();
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroRecipient();
        }
    }

    // Concrete payout hooks implemented by children
    function _payout(address to, uint256 amount) internal virtual;
}
