pragma solidity >=0.4.22 <0.7.0;

import "./Event.sol";


contract EventFactory {
    address[] public events;

    event EventCreated(address _contractAddress);

    function createEvent(bytes1 _hashFunction, bytes1 _size, bytes32 _digest)
        public
    {
        Event newEvent = new Event(msg.sender, _hashFunction, _size, _digest);
        events.push(address(newEvent));
        emit EventCreated(address(newEvent));
    }

    function getEvents() public view returns (address[] memory) {
        return events;
    }
}

//"0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000"
//"0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000",10,3