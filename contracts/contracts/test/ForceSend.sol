// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ForceSend {
    constructor() payable {}

    function boom(address payable target) external {
        selfdestruct(target);
    }
}
