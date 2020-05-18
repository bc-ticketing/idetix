// SPDX-License-Identifier: MIT

pragma solidity >=0.4.22 <0.7.0;

import "./Event.sol";


//"0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000"
//"0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000",10,3
//"0xBfcE6Cc0aA9950427576bD2114E1e3eBf629C562", "0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000",10,1000000000000000000

contract EventFactory {
    address[] public events;

    event EventCreated(address _contractAddress);

    function createEvent(
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        address _erc20Address
    ) public {
        Event newEvent = new Event(
            msg.sender,
            _hashFunction,
            _size,
            _digest,
            _erc20Address
        );
        events.push(address(newEvent));
        emit EventCreated(address(newEvent));
    }

    function getEvents() public view returns (address[] memory) {
        return events;
    }
}
