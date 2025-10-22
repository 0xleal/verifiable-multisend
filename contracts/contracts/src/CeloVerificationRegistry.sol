// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {IVerificationRegistry} from "./interfaces/IVerificationRegistry.sol";
import {IMailbox} from "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";

/**
 * @title CeloVerificationRegistry
 * @notice Central registry for Self.xyz verification on Celo with cross-chain relay capability
 * @dev Receives verification proofs from Self.xyz Hub and stores 30-day expiry
 *      Can relay verification to other chains via Hyperlane
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

    /// @notice Hyperlane mailbox for cross-chain messaging (optional, can be address(0))
    IMailbox public immutable mailbox;

    // ====================================================
    // Events
    // ====================================================

    /**
     * @notice Emitted when a verification is relayed to another chain
     * @param account The address whose verification was relayed
     * @param destinationDomain Hyperlane domain ID of destination chain
     * @param recipientRegistry Address of the registry on destination chain
     * @param expiresAt The expiry timestamp being relayed
     * @param messageId Hyperlane message ID
     */
    event VerificationRelayed(
        address indexed account,
        uint32 indexed destinationDomain,
        bytes32 recipientRegistry,
        uint256 expiresAt,
        bytes32 messageId
    );

    // ====================================================
    // Errors
    // ====================================================

    error InvalidUserIdentifier();
    error AccountNotVerified();
    error MailboxNotConfigured();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @param identityVerificationHubAddress Address of Identity Verification Hub V2 on Celo
     * @param scopeSeed Scope seed string used for proof verification
     * @param _mailbox Address of Hyperlane mailbox for cross-chain relay (can be address(0) to disable)
     */
    constructor(
        address identityVerificationHubAddress,
        string memory scopeSeed,
        address _mailbox
    )
        SelfVerificationRoot(identityVerificationHubAddress, scopeSeed)
        Ownable(_msgSender())
    {
        mailbox = IMailbox(_mailbox);
    }

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

    // ====================================================
    // Cross-Chain Relay
    // ====================================================

    /**
     * @notice Relay a user's verification to another chain via Hyperlane
     * @param destinationDomain Hyperlane domain ID of destination chain (e.g., 84532 for Base Sepolia)
     * @param recipientRegistry Address of CrossChainVerificationRegistry on destination (as bytes32)
     * @param account Address whose verification to relay
     * @return messageId Hyperlane message ID
     * @dev Anyone can relay anyone's verification (relayer pays Hyperlane fees)
     * @dev Requires mailbox to be configured (not address(0))
     * @dev msg.value is forwarded to Hyperlane for cross-chain fees
     */
    function relayVerificationTo(
        uint32 destinationDomain,
        bytes32 recipientRegistry,
        address account
    ) external payable returns (bytes32 messageId) {
        if (address(mailbox) == address(0)) revert MailboxNotConfigured();

        uint256 expiresAt = verificationExpiresAt(account);
        if (expiresAt <= block.timestamp) revert AccountNotVerified();

        // Encode message: (address, expiresAt)
        bytes memory message = abi.encode(account, expiresAt);

        // Send via Hyperlane
        messageId = mailbox.dispatch{value: msg.value}(
            destinationDomain,
            recipientRegistry,
            message
        );

        emit VerificationRelayed(
            account,
            destinationDomain,
            recipientRegistry,
            expiresAt,
            messageId
        );
    }

    /**
     * @notice Receive function to accept refunds from Hyperlane hooks
     * @dev Hyperlane hooks may refund excess msg.value after paying fees
     */
    receive() external payable {}
}
