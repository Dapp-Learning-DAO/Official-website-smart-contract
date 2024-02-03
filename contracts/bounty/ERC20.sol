// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DLT is ERC20 {
    constructor() ERC20("DLT", "DLT") {
        _mint(msg.sender, 100000000000000000000000000000000 ether);
    }
}
