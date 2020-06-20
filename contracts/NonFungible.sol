// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import './EventV3.sol';


abstract contract NonFungible is EventV3{
    event MintNonFungibles(address indexed owner, uint256 ticketType, uint256[] ids);

    function mintNonFungibles(uint _type, uint256[] calldata _ids)
        external payable
        onlyNonFungible(_type)
        onlyCorrectValue(_type, _ids.length)
        onlyLessThanMaxTickets(msg.sender, _ids.length)
        onlyVerified(msg.sender)
    {
        for(uint256 i = 0; i<_ids.length; i++){
            mintNonFungible(_type, _ids[i]);
        }
        totalTickets[msg.sender] = totalTickets[msg.sender].add(_ids.length);
        owner.transfer(ticketTypeMeta[_type].price * _ids.length);
        emit MintNonFungibles(msg.sender, _type, _ids);
    }

    function mintNonFungible(uint256 _type, uint256 _id)
        internal
        onlyMintableNfId(_type, _id)
    {
        nfTickets[_type][_id] = msg.sender;
    }
}

