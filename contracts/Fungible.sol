// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import './EventV3.sol';


abstract contract Fungible is EventV3{
    event MintFungible(address indexed owner, uint256 ticketType, uint256 quantity);
    
    function mintFungible(uint _id, uint256 _quantity)
        external payable
        onlyFungible(_id)
        onlyCorrectValue(_id, _quantity)
        onlyLessThanMaxTickets(msg.sender, _quantity)
        onlyVerified(msg.sender)
    {
        // Grant the ticket to the caller
        tickets[_id][msg.sender] = _quantity.add(tickets[_id][msg.sender]);
        totalTickets[msg.sender] = totalTickets[msg.sender].add(_quantity);

        owner.transfer(ticketTypeMeta[_id].price * _quantity);
        
        emit MintFungible(msg.sender, _id, _quantity);
    }
}