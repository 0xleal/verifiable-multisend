// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

contract MultiSendSelfGuarded is SelfVerificationRoot, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Stored human-only config id set on deployment
    bytes32 public immutable verificationConfigId;

    event BatchSent(
        address indexed sender,
        address indexed token,
        bool isNative,
        uint256 recipients,
        uint256 totalAmount
    );

    error LengthMismatch();
    error ZeroAddress();
    error ValueMismatch();
    error TooManyRecipients();

    constructor(
        address hub,
        string memory scopeSeed,
        bytes32 humanOnlyConfigId
    ) SelfVerificationRoot(hub, scopeSeed) {
        verificationConfigId = humanOnlyConfigId;
    }

    function _forwardVerify(
        bytes calldata proofPayload,
        bytes memory userContextData
    ) internal {
        (bool ok, bytes memory err) = address(this).call(
            abi.encodeWithSelector(
                this.verifySelfProof.selector,
                proofPayload,
                userContextData
            )
        );
        require(ok, string(err.length > 0 ? err : bytes("verify failed")));
    }

    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    function batchSendERC20(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes calldata proofPayload
    ) external nonReentrant {
        if (token == address(0)) revert ZeroAddress();
        if (recipients.length != amounts.length) revert LengthMismatch();
        if (recipients.length == 0) return;
        if (recipients.length > 200) revert TooManyRecipients();

        // Build and submit verification request; execution will occur in custom hook (to be implemented)
        bytes32 destinationChainId = bytes32(block.chainid);
        bytes32 userIdentifier = bytes32(uint256(uint160(msg.sender)));
        bytes memory data = abi.encode(
            uint8(1),
            token,
            msg.sender,
            recipients,
            amounts
        );
        bytes memory userContextData = bytes.concat(
            destinationChainId,
            userIdentifier,
            data
        );
        _forwardVerify(proofPayload, userContextData);
    }

    function batchSendNative(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes calldata proofPayload
    ) external payable nonReentrant {
        if (recipients.length != amounts.length) revert LengthMismatch();
        if (recipients.length == 0) return;
        if (recipients.length > 300) revert TooManyRecipients();

        uint256 total;
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            total += amounts[i];
        }
        if (msg.value != total) revert ValueMismatch();

        bytes32 destinationChainId = bytes32(block.chainid);
        bytes32 userIdentifier = bytes32(uint256(uint160(msg.sender)));
        bytes memory data = abi.encode(
            uint8(2),
            msg.sender,
            recipients,
            amounts,
            total
        );
        bytes memory userContextData = bytes.concat(
            destinationChainId,
            userIdentifier,
            data
        );
        _forwardVerify(proofPayload, userContextData);
    }

    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory /* output */,
        bytes memory userData
    ) internal override {
        // userData format: | 32 destChainId | 32 userIdentifier | abi.encode(mode, ...) |
        bytes memory data;
        assembly {
            let totalLen := mload(userData)
            let start := add(userData, 96)
            let newLen := sub(totalLen, 64)
            data := mload(0x40)
            mstore(data, newLen)
            for {
                let i := 0
            } lt(i, newLen) {
                i := add(i, 32)
            } {
                mstore(add(add(data, 32), i), mload(add(start, i)))
            }
            mstore(0x40, add(add(data, 32), newLen))
        }

        uint8 mode = abi.decode(data, (uint8));
        if (mode == 1) {
            (
                ,
                address token,
                address from,
                address[] memory recipients,
                uint256[] memory amounts
            ) = abi.decode(
                    data,
                    (uint8, address, address, address[], uint256[])
                );
            if (recipients.length == 0) return;
            if (recipients.length > 200) revert TooManyRecipients();
            IERC20 erc20 = IERC20(token);
            uint256 total;
            for (uint256 i = 0; i < recipients.length; i++) {
                address to = recipients[i];
                if (to == address(0)) revert ZeroAddress();
                uint256 amt = amounts[i];
                total += amt;
                erc20.safeTransferFrom(from, to, amt);
            }
            emit BatchSent(from, token, false, recipients.length, total);
        } else if (mode == 2) {
            (
                ,
                address from,
                address[] memory recipients,
                uint256[] memory amounts,
                uint256 total
            ) = abi.decode(
                    data,
                    (uint8, address, address[], uint256[], uint256)
                );
            if (recipients.length == 0) return;
            if (recipients.length > 300) revert TooManyRecipients();
            uint256 sent;
            for (uint256 i = 0; i < recipients.length; i++) {
                address payable to = payable(recipients[i]);
                if (to == address(0)) revert ZeroAddress();
                uint256 amt = amounts[i];
                sent += amt;
                (bool ok, ) = to.call{value: amt}("");
                require(ok, "native transfer failed");
            }
            require(sent == total, "invariant");
            emit BatchSent(from, address(0), true, recipients.length, total);
        } else {
            revert("unknown mode");
        }
    }
}
