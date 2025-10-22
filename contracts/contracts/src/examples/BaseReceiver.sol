// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IMessageRecipient} from "@hyperlane-xyz/core/contracts/interfaces/IMessageRecipient.sol";
import {IMailbox} from "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";
import {TypeCasts} from "@hyperlane-xyz/core/contracts/libs/TypeCasts.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BaseReceiver
 * @notice Receives cross-chain messages from Celo Sepolia via Hyperlane
 * @dev Deployed on Base Sepolia (Chain ID: 84532)
 * @dev Verified mailbox: 0x6966b0E55883d49BFB24539356a2f8A673E02039
 */
contract BaseReceiver is IMessageRecipient, Ownable {
    using TypeCasts for bytes32;
    using TypeCasts for address;

    // ============ Constants ============

    /// @notice Celo Sepolia domain ID
    uint32 public constant CELO_SEPOLIA_DOMAIN = 11142220;

    /// @notice Hyperlane Mailbox on Base Sepolia
    IMailbox public immutable MAILBOX;

    // ============ Storage ============

    /// @notice Mapping of message ID to received message
    mapping(bytes32 => ReceivedMessage) public receivedMessages;

    /// @notice Counter of total messages received
    uint256 public messageCount;

    /// @notice Trusted senders from Celo Sepolia (optional access control)
    mapping(bytes32 => bool) public trustedSenders;

    /// @notice Whether to enforce trusted senders check
    bool public enforceTrustedSenders;

    // ============ Structs ============

    struct ReceivedMessage {
        uint32 origin;
        bytes32 sender;
        bytes message;
        uint256 timestamp;
        bool exists;
    }

    // ============ Events ============

    /**
     * @notice Emitted when a message is received from Celo Sepolia
     * @param messageId Unique identifier for this message
     * @param origin Origin domain (should be CELO_SEPOLIA_DOMAIN)
     * @param sender Sender address on origin chain (as bytes32)
     * @param message Message body received
     */
    event MessageReceived(
        bytes32 indexed messageId,
        uint32 indexed origin,
        bytes32 indexed sender,
        bytes message
    );

    /**
     * @notice Emitted when a trusted sender is added
     * @param sender Sender address (as bytes32)
     */
    event TrustedSenderAdded(bytes32 indexed sender);

    /**
     * @notice Emitted when a trusted sender is removed
     * @param sender Sender address (as bytes32)
     */
    event TrustedSenderRemoved(bytes32 indexed sender);

    /**
     * @notice Emitted when trusted sender enforcement is toggled
     * @param enabled Whether enforcement is enabled
     */
    event TrustedSenderEnforcementToggled(bool enabled);

    // ============ Errors ============

    error NotMailbox();
    error InvalidOrigin(uint32 received, uint32 expected);
    error UntrustedSender(bytes32 sender);
    error MessageAlreadyProcessed();
    error ZeroAddressMailbox();

    // ============ Constructor ============

    /**
     * @notice Initialize the BaseReceiver contract
     * @param _mailbox Address of the Hyperlane Mailbox on Base Sepolia
     *                 Must be: 0x6966b0E55883d49BFB24539356a2f8A673E02039
     */
    constructor(address _mailbox) Ownable(msg.sender) {
        if (_mailbox == address(0)) revert ZeroAddressMailbox();
        MAILBOX = IMailbox(_mailbox);
        enforceTrustedSenders = false; // Start permissionless
    }

    // ============ External Functions ============

    /**
     * @notice Handle incoming messages from Hyperlane
     * @param _origin Domain ID of the origin chain
     * @param _sender Sender address on the origin chain (as bytes32)
     * @param _message Message body
     * @dev This function can only be called by the Hyperlane Mailbox
     * @dev Messages are only accepted from Celo Sepolia (domain 11142220)
     */
    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message
    ) external payable override {
        // Verify caller is the Mailbox
        if (msg.sender != address(MAILBOX)) revert NotMailbox();

        // Verify origin is Celo Sepolia
        if (_origin != CELO_SEPOLIA_DOMAIN) {
            revert InvalidOrigin(_origin, CELO_SEPOLIA_DOMAIN);
        }

        // Optional: Check if sender is trusted (if enforcement enabled)
        if (enforceTrustedSenders && !trustedSenders[_sender]) {
            revert UntrustedSender(_sender);
        }

        // Generate unique message ID
        bytes32 messageId = keccak256(
            abi.encodePacked(_origin, _sender, messageCount, _message)
        );

        // Check if message already processed
        if (receivedMessages[messageId].exists) {
            revert MessageAlreadyProcessed();
        }

        // Store the received message
        receivedMessages[messageId] = ReceivedMessage({
            origin: _origin,
            sender: _sender,
            message: _message,
            timestamp: block.timestamp,
            exists: true
        });

        messageCount++;

        emit MessageReceived(messageId, _origin, _sender, _message);
    }

    // ============ Owner Functions ============

    /**
     * @notice Toggle trusted sender enforcement
     * @param enabled Whether to enforce trusted senders
     */
    function setTrustedSenderEnforcement(bool enabled) external onlyOwner {
        enforceTrustedSenders = enabled;
        emit TrustedSenderEnforcementToggled(enabled);
    }

    /**
     * @notice Add a trusted sender address
     * @param sender Sender address on Celo Sepolia
     * @dev Converts address to bytes32 for storage
     */
    function addTrustedSender(address sender) external onlyOwner {
        bytes32 senderBytes32 = sender.addressToBytes32();
        trustedSenders[senderBytes32] = true;
        emit TrustedSenderAdded(senderBytes32);
    }

    /**
     * @notice Remove a trusted sender address
     * @param sender Sender address on Celo Sepolia
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
    function removeTrustedSenderBytes32(bytes32 senderBytes32) external onlyOwner {
        trustedSenders[senderBytes32] = false;
        emit TrustedSenderRemoved(senderBytes32);
    }

    // ============ View Functions ============

    /**
     * @notice Get a received message by ID
     * @param messageId The message ID to query
     * @return ReceivedMessage struct
     */
    function getMessage(bytes32 messageId)
        external
        view
        returns (ReceivedMessage memory)
    {
        return receivedMessages[messageId];
    }

    /**
     * @notice Check if a sender is trusted
     * @param sender Sender address
     * @return True if trusted, false otherwise
     */
    function isTrustedSender(address sender) external view returns (bool) {
        return trustedSenders[sender.addressToBytes32()];
    }

    /**
     * @notice Check if a sender is trusted (bytes32 format)
     * @param senderBytes32 Sender address as bytes32
     * @return True if trusted, false otherwise
     */
    function isTrustedSenderBytes32(bytes32 senderBytes32)
        external
        view
        returns (bool)
    {
        return trustedSenders[senderBytes32];
    }

    /**
     * @notice Get the local domain (chain) ID
     * @return Local domain identifier (should be 84532 for Base Sepolia)
     */
    function localDomain() external view returns (uint32) {
        return MAILBOX.localDomain();
    }

    /**
     * @notice Decode a message as a string
     * @param messageId The message ID to decode
     * @return The decoded string message
     */
    function getMessageAsString(bytes32 messageId)
        external
        view
        returns (string memory)
    {
        require(receivedMessages[messageId].exists, "Message does not exist");
        return string(receivedMessages[messageId].message);
    }

    /**
     * @notice Get sender address from bytes32
     * @param messageId The message ID
     * @return Sender address
     */
    function getSenderAddress(bytes32 messageId)
        external
        view
        returns (address)
    {
        require(receivedMessages[messageId].exists, "Message does not exist");
        return receivedMessages[messageId].sender.bytes32ToAddress();
    }
}