// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";

import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

contract ClaimDropSelf is SelfVerificationRoot, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Drop {
        address token;
        bytes32 merkleRoot;
        uint256 total;
        uint256 funded;
        bytes32 configId;
        bool isNative;
    }

    mapping(uint256 => Drop) public drops;
    mapping(uint256 => mapping(bytes32 => bool)) public claimed; // dropId => leaf => claimed
    uint256 public nextDropId = 1;

    event DropCreated(
        uint256 indexed dropId,
        bytes32 merkleRoot,
        bytes32 configId,
        bool isNative
    );
    event DropFunded(uint256 indexed dropId, uint256 amount, bool isNative);
    event Claimed(uint256 indexed dropId, address indexed to, uint256 amount);
    event Swept(
        uint256 indexed dropId,
        address indexed to,
        uint256 amountRemaining
    );

    constructor(
        address hub,
        string memory scopeSeed
    ) SelfVerificationRoot(hub, scopeSeed) {}

    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 userIdentifier,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        // In this flow userIdentifier is dropId encoded when verifying claims
        uint256 dropId = uint256(userIdentifier);
        return drops[dropId].configId;
    }

    function createDrop(
        SelfUtils.UnformattedVerificationConfigV2 calldata /* cfg */,
        address token,
        bytes32 merkleRoot,
        uint256 total,
        bool isNative
    ) external returns (uint256 dropId) {
        dropId = nextDropId++;

        // In a full implementation, cfg would be registered on-chain to obtain configId
        bytes32 configId = bytes32(
            uint256(keccak256(abi.encode(merkleRoot, total, isNative)))
        );

        drops[dropId] = Drop({
            token: token,
            merkleRoot: merkleRoot,
            total: total,
            funded: 0,
            configId: configId,
            isNative: isNative
        });

        emit DropCreated(dropId, merkleRoot, configId, isNative);
    }

    function fundDrop(uint256 dropId, uint256 amount) external {
        Drop storage d = drops[dropId];
        require(!d.isNative, "native only via fundDropNative");
        require(d.token != address(0), "token");
        d.funded += amount;
        IERC20(d.token).safeTransferFrom(msg.sender, address(this), amount);
        emit DropFunded(dropId, amount, false);
    }

    function fundDropNative(uint256 dropId) external payable {
        Drop storage d = drops[dropId];
        require(d.isNative, "erc20 drop");
        d.funded += msg.value;
        emit DropFunded(dropId, msg.value, true);
    }

    function claim(
        uint256 dropId,
        uint256 amount,
        bytes32[] calldata merkleProof,
        bytes calldata proofPayload
    ) external nonReentrant {
        Drop storage d = drops[dropId];
        bytes32 leaf = keccak256(abi.encode(msg.sender, amount));
        require(!claimed[dropId][leaf], "claimed");
        require(MerkleProof.verify(merkleProof, d.merkleRoot, leaf), "merkle");

        // Build userContextData for hub: we will encode dropId in userIdentifier for getConfigId
        bytes32 destinationChainId = bytes32(block.chainid);
        bytes32 userIdentifier = bytes32(dropId);
        bytes memory data = abi.encode(uint8(3), msg.sender, amount);
        bytes memory userContextData = bytes.concat(
            destinationChainId,
            userIdentifier,
            data
        );
        (bool ok, bytes memory err) = address(this).call(
            abi.encodeWithSelector(
                this.verifySelfProof.selector,
                proofPayload,
                userContextData
            )
        );
        require(ok, string(err.length > 0 ? err : bytes("verify failed")));

        // Payout will happen in customVerificationHook after successful proof
    }

    function sweepUnclaimed(uint256 dropId, address to) external {
        Drop storage d = drops[dropId];
        uint256 amount = d.funded;
        d.funded = 0;
        if (d.isNative) {
            (bool ok, ) = payable(to).call{value: amount}("");
            require(ok, "sweep native");
        } else {
            IERC20(d.token).safeTransfer(to, amount);
        }
        emit Swept(dropId, to, amount);
    }
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory /* output */,
        bytes memory userData
    ) internal override {
        // userData = | 32 destChainId | 32 userIdentifier (= dropId) | data |
        bytes32 userIdentifier;
        assembly {
            userIdentifier := mload(add(userData, 64))
        }
        uint256 dropId = uint256(userIdentifier);

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

        (, address claimer, uint256 amount) = abi.decode(
            data,
            (uint8, address, uint256)
        );

        Drop storage d = drops[dropId];
        bytes32 leaf = keccak256(abi.encode(claimer, amount));
        require(!claimed[dropId][leaf], "claimed");
        require(d.merkleRoot != bytes32(0), "drop");
        // Note: merkle membership was validated before verification, and leaf re-derived here from claimer+amount

        claimed[dropId][leaf] = true;
        if (d.isNative) {
            require(d.funded >= amount, "funds");
            d.funded -= amount;
            (bool ok, ) = payable(claimer).call{value: amount}("");
            require(ok, "native send");
        } else {
            require(d.funded >= amount, "funds");
            d.funded -= amount;
            IERC20(d.token).safeTransfer(claimer, amount);
        }
        emit Claimed(dropId, claimer, amount);
    }
}
