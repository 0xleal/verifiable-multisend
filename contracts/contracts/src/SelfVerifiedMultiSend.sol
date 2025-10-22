// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVerificationRegistry} from "./interfaces/IVerificationRegistry.sol";

/**
 * @title SelfVerifiedMultiSend
 * @notice Bulk transfers of ERC20 and ETH gated by verification registry with a 30-day expiry window.
 */
contract SelfVerifiedMultiSend {
    // ====================================================
    // Storage
    // ====================================================

    /// @notice The verification registry to check sender verification status
    IVerificationRegistry public immutable verificationRegistry;

    // ====================================================
    // Errors
    // ====================================================

    error SenderNotVerified();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @param _verificationRegistry Address of the verification registry contract
     */
    constructor(address _verificationRegistry) {
        verificationRegistry = IVerificationRegistry(_verificationRegistry);
    }

    // ====================================================
    // Views
    // ====================================================

    /// @notice Returns true if the given address is currently verified (not expired).
    function isSenderVerified(address account) public view returns (bool) {
        return verificationRegistry.isVerified(account);
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
            // Ensure target is a contract
            if iszero(extcodesize(_token)) {
                revert(0, 0)
            }

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

            switch returndatasize()
            case 0 {

            }
            case 0x20 {
                returndatacopy(0x00, 0x00, 0x20)
                if iszero(mload(0x00)) {
                    revert(0, 0)
                }
            }
            default {
                revert(0, 0)
            }

            // end of array
            let end := add(_addresses.offset, shl(5, _addresses.length))
            // diff = _addresses.offset - _amounts.offset
            let diff := sub(_addresses.offset, _amounts.offset)
            // remaining = total amount to distribute
            let remaining := _totalAmount

            // Loop through the addresses
            for {
                let addressOffset := _addresses.offset
            } 1 {

            } {
                // transfer(address to, uint256 value)
                mstore(0x00, hex"a9059cbb")
                // to address
                mstore(0x04, calldataload(addressOffset))
                // amount
                let amount := calldataload(sub(addressOffset, diff))
                mstore(0x24, amount)

                // Ensure we don't send more than remaining
                if lt(remaining, amount) {
                    revert(0, 0)
                }
                remaining := sub(remaining, amount)

                // transfer the tokens
                if iszero(call(gas(), _token, 0, 0x00, 0x44, 0, 0)) {
                    revert(0, 0)
                }
                switch returndatasize()
                case 0 {

                }
                case 0x20 {
                    returndatacopy(0x00, 0x00, 0x20)
                    if iszero(mload(0x00)) {
                        revert(0, 0)
                    }
                }
                default {
                    revert(0, 0)
                }
                // increment the address offset
                addressOffset := add(addressOffset, 0x20)
                // if addressOffset >= end, break
                if iszero(lt(addressOffset, end)) {
                    break
                }
            }

            // Refund any leftover tokens back to caller
            if remaining {
                // transfer(address to, uint256 value)
                mstore(0x00, hex"a9059cbb")
                mstore(0x04, caller())
                mstore(0x24, remaining)
                if iszero(call(gas(), _token, 0, 0x00, 0x44, 0, 0)) {
                    revert(0, 0)
                }
                switch returndatasize()
                case 0 {

                }
                case 0x20 {
                    returndatacopy(0x00, 0x00, 0x20)
                    if iszero(mload(0x00)) {
                        revert(0, 0)
                    }
                }
                default {
                    revert(0, 0)
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
