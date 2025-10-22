// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IVerificationRegistry
 * @notice Interface for verification registries that track user verification status
 * @dev All verification registries must implement this interface to ensure compatibility
 */
interface IVerificationRegistry {
    // ====================================================
    // Events
    // ====================================================

    /**
     * @notice Emitted when a user's verification is updated
     * @param account The address that was verified
     * @param expiresAt Unix timestamp when verification expires
     */
    event VerificationUpdated(address indexed account, uint256 expiresAt);

    // ====================================================
    // View Functions
    // ====================================================

    /**
     * @notice Check if an address is currently verified (not expired)
     * @param account The address to check
     * @return True if the address has a valid, non-expired verification
     */
    function isVerified(address account) external view returns (bool);

    /**
     * @notice Get the unix timestamp when verification expires for an address
     * @param account The address to check
     * @return Unix timestamp of expiry (0 if never verified)
     */
    function verificationExpiresAt(
        address account
    ) external view returns (uint256);

    /**
     * @notice Get the verification scope used by this registry
     * @return The scope hash used for Self.xyz verification
     * @dev Used by frontend to generate correct QR codes
     */
    function getScope() external view returns (uint256);
}
