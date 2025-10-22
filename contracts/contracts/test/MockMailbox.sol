// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IMailboxV3} from "../src/examples/IMailboxV3.sol";
import {IMessageRecipient} from "@hyperlane-xyz/core/contracts/interfaces/IMessageRecipient.sol";

/**
 * @title MockMailbox
 * @notice Mock implementation of Hyperlane Mailbox for testing
 */
contract MockMailbox is IMailboxV3 {
    uint32 public immutable _localDomain;
    uint32 private _messageCount;
    mapping(bytes32 => bool) private _delivered;

    event Dispatch(
        uint32 indexed destination,
        bytes32 indexed recipient,
        bytes message
    );

    constructor(uint32 domain) {
        _localDomain = domain;
    }

    function dispatch(
        uint32 destinationDomain,
        bytes32 recipientAddress,
        bytes calldata messageBody
    ) external payable override returns (bytes32) {
        _messageCount++;
        bytes32 messageId = bytes32(uint256(_messageCount));

        emit Dispatch(destinationDomain, recipientAddress, messageBody);

        return messageId;
    }

    function delivered(bytes32 messageId) external view override returns (bool) {
        return _delivered[messageId];
    }

    function localDomain() external view override returns (uint32) {
        return _localDomain;
    }

    function count() external view returns (uint32) {
        return _messageCount;
    }

    // Helper function for tests to simulate message delivery
    function deliverMessage(
        address recipient,
        uint32 origin,
        bytes32 sender,
        bytes calldata message
    ) external {
        IMessageRecipient(recipient).handle(origin, sender, message);
    }

    function markDelivered(bytes32 messageId) external {
        _delivered[messageId] = true;
    }
}
