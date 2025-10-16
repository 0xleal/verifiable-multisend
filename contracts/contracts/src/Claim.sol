// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

/**
 * @title Claim (Base)
 * @notice Common logic for claim-style distributions gated by Self protocol verification (E-Passport and EU ID).
 *         Users prove eligibility with a Self proof and claim entitlements validated by a Merkle root.
 *         Token transfer mechanics are implemented by child contracts via _payout().
 */
abstract contract Claim is SelfVerificationRoot, Ownable {
    // ====================================================
    // Storage
    // ====================================================

    /// @notice Merkle root used to validate claim entitlements.
    bytes32 public merkleRoot;

    /// @notice Tracks addresses that have claimed.
    mapping(address => bool) public claimed;

    /// @notice Maps user identifiers to verification status (set after successful Self verification)
    mapping(uint256 userIdentifier => bool verified)
        internal _verifiedUserIdentifiers;

    /// @notice Prevents nullifier reuse across this contract
    mapping(uint256 nullifier => bool used) internal _usedNullifiers;

    /// @notice Verification config ID for identity verification
    bytes32 public verificationConfigId;

    // ====================================================
    // Errors
    // ====================================================

    error InvalidProof();
    error AlreadyClaimed();
    error NotVerified(address unverifiedAddress);
    error InvalidUserIdentifier();
    error RegisteredNullifier();
    error NativeTransferFailed();

    // ====================================================
    // Events
    // ====================================================

    event Claimed(uint256 index, address account, uint256 amount);
    event MerkleRootUpdated(bytes32 newMerkleRoot);

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

    function setMerkleRoot(bytes32 newMerkleRoot) external onlyOwner {
        merkleRoot = newMerkleRoot;
        emit MerkleRootUpdated(newMerkleRoot);
    }

    function setConfigId(bytes32 configId) external onlyOwner {
        verificationConfigId = configId;
    }

    // ====================================================
    // Views
    // ====================================================

    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    function isVerified(address user) public view returns (bool) {
        return _verifiedUserIdentifiers[uint256(uint160(user))];
    }

    // ====================================================
    // Claim
    // ====================================================

    /**
     * @notice Claims an entitlement after verification and Merkle validation.
     * @dev Requires the caller to have successfully verified at least once (no registration window).
     */
    function claim(
        uint256 index,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external {
        if (claimed[msg.sender]) revert AlreadyClaimed();
        if (!isVerified(msg.sender)) revert NotVerified(msg.sender);

        // Verify the Merkle proof against leaf: keccak256(abi.encodePacked(index, msg.sender, amount))
        bytes32 node = keccak256(abi.encodePacked(index, msg.sender, amount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, node))
            revert InvalidProof();

        claimed[msg.sender] = true;
        _payout(msg.sender, amount);
        emit Claimed(index, msg.sender, amount);
    }

    // ====================================================
    // Self Verification Hook
    // ====================================================

    /**
     * @notice Called by Self hub during successful verification flow.
     * @dev Marks the provided userIdentifier as verified; enforces nullifier single-use.
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /* userData */
    ) internal override {
        if (_usedNullifiers[output.nullifier]) revert RegisteredNullifier();
        if (output.userIdentifier == 0) revert InvalidUserIdentifier();

        _usedNullifiers[output.nullifier] = true;
        _verifiedUserIdentifiers[output.userIdentifier] = true;
    }

    // ====================================================
    // Internal payout
    // ====================================================

    function _payout(address to, uint256 amount) internal virtual;
}
