// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import "./EventV3.sol";

contract EventFactory {
    address[] public events;

    event EventCreated(address _contractAddress);

    function createEvent(bytes1 _hashFunction, bytes1 _size, bytes32 _digest) public {
        EventV3 newEvent = new EventV3(msg.sender, _hashFunction, _size, _digest);
        events.push(address(newEvent));
        emit EventCreated(address(newEvent));
    }

    function getEvents() public view returns (address[] memory) {
        return events;
    }
}