// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import "./Events/EventMintableAftermarket.sol";

contract EventFactory {
    address[] public events;
    address public identityContract;

    event EventCreated(address _contractAddress);

    constructor(address _identityContract) public {
        identityContract = _identityContract;
    }

    function createEvent(
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        address _identityApprover,
        uint8 _identityLevel,
        address _erc20Contract,
        uint8 _granularity
    ) public {
        Event newEvent = new EventMintableAftermarket(msg.sender, _hashFunction, _size, _digest, identityContract, _identityApprover, _identityLevel, _erc20Contract, _granularity);
        events.push(address(newEvent));
        emit EventCreated(address(newEvent));
    }

    function getEvents() public view returns (address[] memory) {
        return events;
    }
}