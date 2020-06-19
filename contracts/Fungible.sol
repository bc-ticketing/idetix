// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import './EventV3.sol';


abstract contract Fungible is EventV3{
    event MintFungible(address indexed owner, uint256 ticketTypeId, uint256 quantity);
    
    function mintFungible(uint _type, uint256 _quantity)
        external payable
        onlyCorrectValue(_type, _quantity)
        onlyLessThanMaxTickets(msg.sender, _quantity)
        onlyVerified(msg.sender)
    {
        // TODO check verified user
        require(msg.value == ticketTypeMeta[_type].price * _quantity, "The value does not match the ticket price * quatity.");
        
        // Check if user has more tickets for event than allowed
        require(totalTickets[msg.sender] + _quantity <= maxTicketsPerPerson, "This user cannot buy this many tickets.");
        
        // Grant the ticket to the caller
        tickets[_type][msg.sender] = _quantity.add(tickets[_type][msg.sender]);
        totalTickets[msg.sender] = totalTickets[msg.sender].add(_quantity);

        owner.transfer(ticketTypeMeta[_type].price);
        
        emit MintFungible(msg.sender, _type, _quantity);
    }
}