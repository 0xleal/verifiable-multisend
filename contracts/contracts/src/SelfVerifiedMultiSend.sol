// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

/**
 * @title SelfVerifiedMultiSend
 * @notice Bulk transfers of ERC20 and ETH gated by Self.xyz verification with a 30-day expiry window.
 * @dev Uses the same gas-optimized inner loops as SelfProtectedDrop for transfers.
 */
contract SelfVerifiedMultiSend is SelfVerificationRoot, Ownable {
    // ====================================================
    // Storage
    // ====================================================

    /// @notice Mapping of user identifier (uint256(address)) to unix timestamp when verification expires.
    mapping(uint256 => uint256) internal _verificationExpiryByUserIdentifier;

    /// @notice The verification config id enforced by the hub.
    bytes32 public verificationConfigId;

    // ====================================================
    // Events & Errors
    // ====================================================

    event SenderVerified(address indexed sender, uint256 expiresAt);

    error SenderNotVerified();
    error InvalidUserIdentifier();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @param identityVerificationHubAddress Address of Identity Verification Hub V2 (network specific)
     * @param scopeSeed Human-readable seed used to derive scope with the contract address
     */
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

    /// @notice Sets the verification config id to enforce.
    function setConfigId(bytes32 configId) external onlyOwner {
        verificationConfigId = configId;
    }

    /// @notice Overrides the verification scope used by the hub.
    /// @dev This should be used with caution. Frontend must use a matching scope seed/hash.
    function setScope(uint256 newScope) external onlyOwner {
        _scope = newScope;
    }

    // ====================================================
    // SelfVerificationRoot overrides
    // ====================================================

    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /**
     * @dev Called by the hub after successful proof verification.
     * Registers the caller's userIdentifier with a 30-day expiry.
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
        address sender = address(uint160(uint256(output.userIdentifier)));
        emit SenderVerified(sender, expiresAt);
    }

    // ====================================================
    // Views
    // ====================================================

    /// @notice Returns the scope used by this contract for proof verification.
    function getScope() external view returns (uint256) {
        return _scope;
    }

    /// @notice Returns the unix timestamp when verification expires for a given address.
    function verificationExpiresAt(
        address account
    ) public view returns (uint256) {
        return _verificationExpiryByUserIdentifier[uint256(uint160(account))];
    }

    /// @notice Returns true if the given address is currently verified (not expired).
    function isSenderVerified(address account) public view returns (bool) {
        return verificationExpiresAt(account) > block.timestamp;
    }

    // ====================================================
    // Airdrop functions (gated)
    // ====================================================

    /**
     * @notice Airdrop ERC20 tokens to a list of addresses. Caller must be Self-verified and not expired.
     * @param _token The address of the ERC20 contract
     * @param _addresses The addresses to airdrop to
     * @param _amounts The amounts to airdrop
     * @param _totalAmount The total amount to airdrop (pulled from caller)
     */
    function airdropERC20(
        address _token,
        address[] calldata _addresses,
        uint256[] calldata _amounts,
        uint256 _totalAmount
    ) external payable {
        if (!isSenderVerified(msg.sender)) revert SenderNotVerified();
        assembly {
            // Check that the number of addresses matches the number of amounts
            if iszero(eq(_amounts.length, _addresses.length)) {
                revert(0, 0)
            }

            // transferFrom(address from, address to, uint256 amount)
            mstore(0x00, hex"23b872dd")
            // from address
            mstore(0x04, caller())
            // to address (this contract)
            mstore(0x24, address())
            // total amount
            mstore(0x44, _totalAmount)

            // pull total amount to this contract
            if iszero(call(gas(), _token, 0, 0x00, 0x64, 0, 0)) {
                revert(0, 0)
            }

            // transfer(address to, uint256 value)
            mstore(0x00, hex"a9059cbb")

            // end of array
            let end := add(_addresses.offset, shl(5, _addresses.length))
            // diff = _addresses.offset - _amounts.offset
            let diff := sub(_addresses.offset, _amounts.offset)

            // Loop through the addresses
            for {
                let addressOffset := _addresses.offset
            } 1 {

            } {
                // to address
                mstore(0x04, calldataload(addressOffset))
                // amount
                mstore(0x24, calldataload(sub(addressOffset, diff)))
                // transfer the tokens
                if iszero(call(gas(), _token, 0, 0x00, 0x64, 0, 0)) {
                    revert(0, 0)
                }
                // increment the address offset
                addressOffset := add(addressOffset, 0x20)
                // if addressOffset >= end, break
                if iszero(lt(addressOffset, end)) {
                    break
                }
            }
        }
    }

    /**
     * @notice Airdrop ETH to a list of addresses. Caller must be Self-verified and not expired.
     * @param _addresses The addresses to airdrop to
     * @param _amounts The amounts to airdrop
     */
    function airdropETH(
        address[] calldata _addresses,
        uint256[] calldata _amounts
    ) external payable {
        if (!isSenderVerified(msg.sender)) revert SenderNotVerified();
        assembly {
            // Check that the number of addresses matches the number of amounts
            if iszero(eq(_amounts.length, _addresses.length)) {
                revert(0, 0)
            }

            // iterator
            let i := _addresses.offset
            // end of array
            let end := add(i, shl(5, _addresses.length))
            // diff = _amounts.offset - _addresses.offset
            let diff := sub(_amounts.offset, _addresses.offset)

            // Loop through the addresses
            for {

            } 1 {

            } {
                // transfer the ETH
                if iszero(
                    call(
                        gas(),
                        calldataload(i),
                        calldataload(add(i, diff)),
                        0x00,
                        0x00,
                        0x00,
                        0x00
                    )
                ) {
                    revert(0x00, 0x00)
                }
                // increment the iterator
                i := add(i, 0x20)
                // if i >= end, break
                if eq(end, i) {
                    break
                }
            }
        }
    }
}
