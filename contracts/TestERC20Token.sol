// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20Token is ERC20 {
    constructor(uint256 _initialSupply, string memory _name, string memory _nameTag) ERC20(_name, _nameTag)
        public
    {
        _mint(msg.sender, _initialSupply);
    }
}
