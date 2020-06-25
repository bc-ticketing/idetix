// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import './EventV3.sol';


abstract contract NonFungible is EventV3{
    event MintNonFungibles(address indexed owner, uint256[] ids);

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
        tickets[getNonFungibleBaseType(_id)][msg.sender] += 1;
        nfOwners[_id] = msg.sender;
        return ticketTypeMeta[getNonFungibleBaseType(_id)].price;
    }
}

