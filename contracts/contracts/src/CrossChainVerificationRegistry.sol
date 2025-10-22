// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMessageRecipient} from "@hyperlane-xyz/core/contracts/interfaces/IMessageRecipient.sol";
import {IMailbox} from "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";
import {TypeCasts} from "@hyperlane-xyz/core/contracts/libs/TypeCasts.sol";
import {IVerificationRegistry} from "./interfaces/IVerificationRegistry.sol";

/**
 * @title CrossChainVerificationRegistry
 * @notice Verification registry for chains other than Celo (e.g., Base, Arbitrum)
 * @dev Receives verification messages from CeloVerificationRegistry via Hyperlane
 *      Implements the same IVerificationRegistry interface for compatibility
 *      Does NOT accept Self.xyz proofs directly - verification must happen on Celo
 */
contract CrossChainVerificationRegistry is
    IVerificationRegistry,
    IMessageRecipient,
    Ownable
{
    using TypeCasts for bytes32;
    using TypeCasts for address;

    // ====================================================
    // Storage
    // ====================================================

    /// @notice Hyperlane mailbox on this chain
    IMailbox public immutable mailbox;

    /// @notice Source chain domain ID (Celo domain)
    uint32 public immutable sourceDomain;

    /// @notice Verification scope (copied from Celo registry for interface compatibility)
    uint256 public immutable scope;

    /// @notice Mapping of address to verification expiry timestamp
    mapping(address => uint256) internal _verificationExpiry;

    /// @notice Trusted sender addresses (Celo registries authorized to send verifications)
    mapping(bytes32 => bool) public trustedSenders;

    /// @notice Whether to enforce trusted sender check
    bool public enforceTrustedSenders;

    // ====================================================
    // Events
    // ====================================================

    /**
     * @notice Emitted when a trusted sender is added
     * @param sender The authorized sender address (as bytes32)
     */
    event TrustedSenderAdded(bytes32 indexed sender);

    /**
     * @notice Emitted when a trusted sender is removed
     * @param sender The removed sender address (as bytes32)
     */
    event TrustedSenderRemoved(bytes32 indexed sender);

    /**
     * @notice Emitted when trusted sender enforcement is toggled
     * @param enabled Whether enforcement is now enabled
     */
    event TrustedSenderEnforcementToggled(bool enabled);

    /**
     * @notice Emitted when a verification is received from Celo
     * @param account The address that was verified
     * @param expiresAt The expiry timestamp
     * @param origin Origin domain ID (should be sourceDomain)
     * @param sender Sender address on origin chain
     */
    event VerificationReceived(
        address indexed account,
        uint256 expiresAt,
        uint32 origin,
        bytes32 sender
    );

    // ====================================================
    // Errors
    // ====================================================

    error OnlyMailbox();
    error InvalidOrigin(uint32 received, uint32 expected);
    error UntrustedSender(bytes32 sender);
    error ZeroAddressMailbox();
    error CannotVerifyOnThisChain();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @param _mailbox Address of Hyperlane mailbox on this chain
     * @param _sourceDomain Hyperlane domain ID of source chain (Celo)
     * @param _scope Verification scope (from Celo registry, for interface compatibility)
     */
    constructor(address _mailbox, uint32 _sourceDomain, uint256 _scope)
        Ownable(msg.sender)
    {
        if (_mailbox == address(0)) revert ZeroAddressMailbox();
        mailbox = IMailbox(_mailbox);
        sourceDomain = _sourceDomain;
        scope = _scope;
        enforceTrustedSenders = false; // Start permissionless
    }

    // ====================================================
    // Hyperlane Message Handling
    // ====================================================

    /**
     * @notice Handle incoming verification messages from Celo via Hyperlane
     * @param _origin Domain ID of origin chain
     * @param _sender Sender address on origin chain (as bytes32)
     * @param _message Encoded verification data (address, expiresAt)
     * @dev Only callable by Hyperlane mailbox
     * @dev Only accepts messages from sourceDomain
     * @dev Optionally checks trusted senders
     */
    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message
    ) external payable override {
        // Verify caller is the mailbox
        if (msg.sender != address(mailbox)) revert OnlyMailbox();

        // Verify origin is the source domain (Celo)
        if (_origin != sourceDomain) {
            revert InvalidOrigin(_origin, sourceDomain);
        }

        // Optional: Check if sender is trusted
        if (enforceTrustedSenders && !trustedSenders[_sender]) {
            revert UntrustedSender(_sender);
        }

        // Decode message
        (address account, uint256 expiresAt) = abi.decode(
            _message,
            (address, uint256)
        );

        // Update local verification state
        _verificationExpiry[account] = expiresAt;

        emit VerificationUpdated(account, expiresAt);
        emit VerificationReceived(account, expiresAt, _origin, _sender);
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
        return _verificationExpiry[account];
    }

    /**
     * @notice Get the verification scope
     * @return The scope hash (copied from Celo registry)
     * @dev Cross-chain registries don't verify directly, so this is for reference only
     */
    function getScope() external view override returns (uint256) {
        return scope;
    }

    // ====================================================
    // Trusted Sender Management
    // ====================================================

    /**
     * @notice Add a trusted sender (Celo registry address)
     * @param sender Address of trusted Celo registry
     */
    function addTrustedSender(address sender) external onlyOwner {
        bytes32 senderBytes32 = sender.addressToBytes32();
        trustedSenders[senderBytes32] = true;
        emit TrustedSenderAdded(senderBytes32);
    }

    /**
     * @notice Remove a trusted sender
     * @param sender Address to remove
     */
    function removeTrustedSender(address sender) external onlyOwner {
        bytes32 senderBytes32 = sender.addressToBytes32();
        trustedSenders[senderBytes32] = false;
        emit TrustedSenderRemoved(senderBytes32);
    }

    /**
     * @notice Add a trusted sender (bytes32 format)
     * @param senderBytes32 Sender address as bytes32
     */
    function addTrustedSenderBytes32(bytes32 senderBytes32) external onlyOwner {
        trustedSenders[senderBytes32] = true;
        emit TrustedSenderAdded(senderBytes32);
    }

    /**
     * @notice Remove a trusted sender (bytes32 format)
     * @param senderBytes32 Sender address as bytes32
     */
    function removeTrustedSenderBytes32(
        bytes32 senderBytes32
    ) external onlyOwner {
        trustedSenders[senderBytes32] = false;
        emit TrustedSenderRemoved(senderBytes32);
    }

    /**
     * @notice Toggle trusted sender enforcement
     * @param enabled Whether to enforce trusted senders
     */
    function setTrustedSenderEnforcement(bool enabled) external onlyOwner {
        enforceTrustedSenders = enabled;
        emit TrustedSenderEnforcementToggled(enabled);
    }

    // ====================================================
    // View Functions
    // ====================================================

    /**
     * @notice Check if a sender is trusted
     * @param sender Sender address
     * @return True if trusted
     */
    function isTrustedSender(address sender) external view returns (bool) {
        return trustedSenders[sender.addressToBytes32()];
    }

    /**
     * @notice Check if a sender is trusted (bytes32 format)
     * @param senderBytes32 Sender address as bytes32
     * @return True if trusted
     */
    function isTrustedSenderBytes32(
        bytes32 senderBytes32
    ) external view returns (bool) {
        return trustedSenders[senderBytes32];
    }

    /**
     * @notice Get the local domain (chain) ID
     * @return Local domain identifier
     */
    function localDomain() external view returns (uint32) {
        return mailbox.localDomain();
    }
}
