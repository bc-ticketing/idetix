// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import "./Event.sol";

contract EventFactory {
    address[] public events;
    address public identityContract;

    event EventCreated(address _contractAddress);

    constructor(address _identityContract) public {
        identityContract = _identityContract;
    }

    function createEvent(bytes1 _hashFunction, bytes1 _size, bytes32 _digest) public {
        Event newEvent = new Event(msg.sender, _hashFunction, _size, _digest);
        events.push(address(newEvent));
        emit EventCreated(address(newEvent));
    }

    function getEvents() public view returns (address[] memory) {
        return events;
    }
}