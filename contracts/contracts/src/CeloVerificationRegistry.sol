// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {IVerificationRegistry} from "./interfaces/IVerificationRegistry.sol";

/**
 * @title CeloVerificationRegistry
 * @notice Central registry for Self.xyz verification on Celo
 * @dev Receives verification proofs from Self.xyz Hub and stores 30-day expiry
 *      All contracts (MultiSend, Airdrop) check this single registry
 */
contract CeloVerificationRegistry is
    SelfVerificationRoot,
    IVerificationRegistry,
    Ownable
{
    // ====================================================
    // Storage
    // ====================================================

    /// @notice Mapping of user identifier (uint256(address)) to unix timestamp when verification expires
    mapping(uint256 => uint256) internal _verificationExpiryByUserIdentifier;

    /// @notice The verification config id enforced by the hub
    bytes32 public verificationConfigId;

    // ====================================================
    // Errors
    // ====================================================

    error InvalidUserIdentifier();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @param identityVerificationHubAddress Address of Identity Verification Hub V2 on Celo
     * @param scopeSeed Scope seed string used for proof verification
     */
    constructor(
        address identityVerificationHubAddress,
        string memory scopeSeed
    )
        SelfVerificationRoot(identityVerificationHubAddress, scopeSeed)
        Ownable(_msgSender())
    {}

    // ====================================================
    // Admin Functions
    // ====================================================

    /**
     * @notice Sets the verification config id to enforce
     * @param configId The Self.xyz config ID to use
     */
    function setConfigId(bytes32 configId) external onlyOwner {
        verificationConfigId = configId;
    }

    /**
     * @notice Overrides the verification scope used by the hub
     * @param newScope The new scope hash
     * @dev This should be used with caution. Frontend must use a matching scope seed/hash
     */
    function setScope(uint256 newScope) external onlyOwner {
        _scope = newScope;
    }

    // ====================================================
    // SelfVerificationRoot Overrides
    // ====================================================

    /**
     * @notice Returns the config ID to enforce for verification
     */
    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /**
     * @notice Called by the hub after successful proof verification
     * @dev Registers the user's verification with a 30-day expiry
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /* userData */
    ) internal override {
        if (output.userIdentifier == 0) {
            revert InvalidUserIdentifier();
        }

        uint256 expiresAt = block.timestamp + 30 days;
        _verificationExpiryByUserIdentifier[output.userIdentifier] = expiresAt;

        // Interpret userIdentifier as EVM address when using address-based user id
        address account = address(uint160(uint256(output.userIdentifier)));
        emit VerificationUpdated(account, expiresAt);
    }

    // ====================================================
    // IVerificationRegistry Implementation
    // ====================================================

    /**
     * @notice Check if an address is currently verified (not expired)
     * @param account The address to check
     * @return True if verified and not expired
     */
    function isVerified(address account) external view override returns (bool) {
        return verificationExpiresAt(account) > block.timestamp;
    }

    /**
     * @notice Get the unix timestamp when verification expires for an address
     * @param account The address to check
     * @return Unix timestamp of expiry (0 if never verified)
     */
    function verificationExpiresAt(
        address account
    ) public view override returns (uint256) {
        return _verificationExpiryByUserIdentifier[uint256(uint160(account))];
    }

    /**
     * @notice Get the verification scope used by this registry
     * @return The scope hash used for Self.xyz verification
     */
    function getScope() external view override returns (uint256) {
        return _scope;
    }
}
