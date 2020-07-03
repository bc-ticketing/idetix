// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import './Event.sol';


abstract contract Mintable is Event{
    event MintFungibles(address indexed owner, uint256 ticketType, uint256 quantity);
    event MintNonFungibles(address indexed owner, uint256[] ids);

    function mintFungible(uint256 _id, uint256 _quantity)
        public
        payable
        onlyFungible(_id)
        onlyCorrectValue(_id, _quantity, msg.value)
        onlyLessThanMaxTickets(msg.sender, _quantity)
        onlyVerified(msg.sender)
    {
        // Grant the ticket to the caller
        tickets[_id][msg.sender] = _quantity.add(tickets[_id][msg.sender]);
        totalTickets[msg.sender] = totalTickets[msg.sender].add(_quantity);

        owner.transfer(ticketTypeMeta[_id].price * _quantity);

        emit MintFungibles(msg.sender, _id, _quantity);
    }


    function mintNonFungibles(uint256[] memory _ids)
        public
        payable
        onlyLessThanMaxTickets(msg.sender, _ids.length)
        onlyVerified(msg.sender)
    {
        uint256 totalPrice = 0;

        for(uint256 i = 0; i<_ids.length; i++){
            totalPrice += mintNonFungible(_ids[i]);
        }

        totalTickets[msg.sender] = totalTickets[msg.sender].add(_ids.length);
        require(totalPrice == msg.value, "The sent value does not match the total price.");

        owner.transfer(totalPrice);
        emit MintNonFungibles(msg.sender, _ids);
    }

    function mintNonFungible(uint256 _id)
        private
        onlyNonMintedNf(_id)
        returns(uint256 _price)
    {
        // store how many nf tickets are owned by one account (maybe not needed)
        tickets[_id][msg.sender] = 1;
        nfOwners[_id] = msg.sender;
        return ticketTypeMeta[getBaseType(_id)].price;
    }
}