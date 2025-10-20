// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

contract SelfVerifiedAirdrop is SelfVerificationRoot, Ownable {
    using SafeERC20 for IERC20;

    // ====================================================
    // Structs
    // ====================================================

    struct Airdrop {
        bytes32 merkleRoot;
        address tokenAddress; // address(0) for ETH
        uint256 totalAmount;
        uint256 claimedAmount;
        address creator;
    }

    // ====================================================
    // Storage
    // ====================================================

    mapping(bytes32 => Airdrop) public airdrops;
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    mapping(uint256 => uint256) internal _verificationExpiryByUserIdentifier;
    bytes32 public verificationConfigId;

    // ====================================================
    // Events & Errors
    // ====================================================

    event AirdropCreated(
        bytes32 indexed airdropId,
        address indexed creator,
        address tokenAddress,
        uint256 totalAmount
    );
    event Claimed(
        bytes32 indexed airdropId,
        address indexed claimer,
        uint256 amount
    );
    event SenderVerified(address indexed sender, uint256 expiresAt);

    error NotVerified();
    error InvalidUserIdentifier();
    error AirdropExists();
    error AirdropNotFound();
    error AlreadyClaimed();
    error InvalidProof();
    error AmountExceedsTotal();
    error NativeTransferFailed();

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
    // Modifiers
    // ====================================================

    modifier onlyVerified() {
        if (!isVerified(msg.sender)) revert NotVerified();
        _;
    }

    // ====================================================
    // Admin
    // ====================================================

    function setConfigId(bytes32 configId) external onlyOwner {
        verificationConfigId = configId;
    }

    // ====================================================
    // Self Verification
    // ====================================================

    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /* userData */
    ) internal override {
        if (output.userIdentifier == 0) {
            revert InvalidUserIdentifier();
        }

        uint256 expiresAt = block.timestamp + 30 days;
        _verificationExpiryByUserIdentifier[output.userIdentifier] = expiresAt;

        address sender = address(uint160(uint256(output.userIdentifier)));
        emit SenderVerified(sender, expiresAt);
    }

    // ====================================================
    // Views
    // ====================================================

    function verificationExpiresAt(
        address account
    ) public view returns (uint256) {
        return _verificationExpiryByUserIdentifier[uint256(uint160(account))];
    }

    function isVerified(address account) public view returns (bool) {
        return verificationExpiresAt(account) > block.timestamp;
    }

    function canClaim(
        bytes32 airdropId,
        address user,
        uint256 index,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external view returns (bool) {
        Airdrop storage airdrop_ = airdrops[airdropId];
        if (airdrop_.merkleRoot == 0) return false; // Airdrop doesn't exist
        if (hasClaimed[airdropId][user]) return false;
        if (airdrop_.claimedAmount + amount > airdrop_.totalAmount)
            return false;

        bytes32 node = keccak256(abi.encodePacked(index, user, amount));
        return MerkleProof.verify(merkleProof, airdrop_.merkleRoot, node);
    }

    // ====================================================
    // Airdrop Creation
    // ====================================================

    function createAirdropERC20(
        bytes32 airdropId,
        bytes32 merkleRoot,
        address tokenAddress,
        uint256 totalAmount
    ) external onlyVerified {
        if (airdrops[airdropId].merkleRoot != 0) revert AirdropExists();

        airdrops[airdropId] = Airdrop({
            merkleRoot: merkleRoot,
            tokenAddress: tokenAddress,
            totalAmount: totalAmount,
            claimedAmount: 0,
            creator: msg.sender
        });

        IERC20(tokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            totalAmount
        );

        emit AirdropCreated(airdropId, msg.sender, tokenAddress, totalAmount);
    }

    function createAirdropETH(
        bytes32 airdropId,
        bytes32 merkleRoot
    ) external payable onlyVerified {
        if (airdrops[airdropId].merkleRoot != 0) revert AirdropExists();

        airdrops[airdropId] = Airdrop({
            merkleRoot: merkleRoot,
            tokenAddress: address(0),
            totalAmount: msg.value,
            claimedAmount: 0,
            creator: msg.sender
        });

        emit AirdropCreated(airdropId, msg.sender, address(0), msg.value);
    }

    // ====================================================
    // Claiming
    // ====================================================

    function claim(
        bytes32 airdropId,
        uint256 index,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external onlyVerified {
        Airdrop storage airdrop_ = airdrops[airdropId];
        if (airdrop_.merkleRoot == 0) revert AirdropNotFound();
        if (hasClaimed[airdropId][msg.sender]) revert AlreadyClaimed();

        bytes32 node = keccak256(abi.encodePacked(index, msg.sender, amount));
        if (!MerkleProof.verify(merkleProof, airdrop_.merkleRoot, node)) {
            revert InvalidProof();
        }

        if (airdrop_.claimedAmount + amount > airdrop_.totalAmount) {
            revert AmountExceedsTotal();
        }

        hasClaimed[airdropId][msg.sender] = true;
        airdrop_.claimedAmount += amount;

        if (airdrop_.tokenAddress == address(0)) {
            (bool success, ) = msg.sender.call{value: amount}("");
            if (!success) revert NativeTransferFailed();
        } else {
            IERC20(airdrop_.tokenAddress).safeTransfer(msg.sender, amount);
        }

        emit Claimed(airdropId, msg.sender, amount);
    }
    receive() external payable {}
}
