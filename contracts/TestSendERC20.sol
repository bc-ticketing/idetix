// SPDX-License-Identifier: MIT

pragma solidity >=0.4.22 <0.7.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol";


contract TestSendERC20 {
    address erc20address;
    address owner;
    uint256 ticketPrice;

    constructor(address _erc20address) public {
        erc20address = _erc20address;
        owner = msg.sender;
        ticketPrice = 1;
    }

    /**
     * Requirements:
     * - msg.sender must have previously approved the amount of a ticket directly in the token smart contract.
     */

    function send() public {
        // must be transferFrom since transfer uses msg.sender which is the contract itself!
        ERC20(erc20address).transferFrom(msg.sender, owner, ticketPrice);
    }
}
