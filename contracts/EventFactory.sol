// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import "./Events/EventMintableAftermarketPresale.sol";
import "./Identity.sol";

contract EventFactory {
    address[] public events;
    Identity public identityContract;

    event EventCreated(address _contractAddress);

    constructor(address _identityContract)
        public
    {
        identityContract = Identity(_identityContract);
    }

    function createEvent(
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        address _identityApprover,
        uint8 _identityLevel,
        address _erc20Contract,
        uint8 _granularity
    )
        public
        onlyRegisteredIdentityApprover(_identityApprover)
    {
        Event newEvent = new EventMintableAftermarketPresale(msg.sender, _hashFunction, _size, _digest, address(identityContract), _identityApprover, _identityLevel, _erc20Contract, _granularity);
        events.push(address(newEvent));
        emit EventCreated(address(newEvent));
    }

    function getEvents()
        public
        view
        returns (address[] memory)
    {
        return events;
    }

    // The identity approver must have registered.
    modifier onlyRegisteredIdentityApprover(address _address){
        if(_address != address(0)) require(identityContract.hasRegistered(_address), IdetixLibrary.notRegistered);
        _;
    }
}
