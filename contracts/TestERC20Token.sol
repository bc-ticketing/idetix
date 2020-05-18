// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract TestERC20Token is ERC20 {
    constructor() public ERC20("TestToken", "TES") {
        _mint(msg.sender, 1000);
    }
}
