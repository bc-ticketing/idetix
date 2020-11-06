// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

//import "./Events/EventMintableAftermarketPresale.sol";
import "./Identity.sol";
import "./CloneFactory.sol";
import "./EventClone.sol";
import '@openzeppelin/upgrades/contracts/Initializable.sol';


contract EventFactory is CloneFactory{
    address[] public events;
    Identity public identityContract;
    address public implementation;

    event EventCreated(address _contractAddress);

    constructor(address _implementation, address _identityContract)
        public
    {
        identityContract = Identity(_identityContract);
        implementation = _implementation;
    }

//    constructor(address _identityContract)
//        public
//    {
//        identityContract = Identity(_identityContract);
//    }

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
        address clone = createClone(implementation);

        EventClone newEvent = EventClone(clone).init(msg.sender, _hashFunction, _size, _digest, address(identityContract), _identityApprover, _identityLevel, _erc20Contract, _granularity);

//        EventMintableAftermarketPresale newEvent = new EventMintableAftermarketPresale(msg.sender, _hashFunction, _size, _digest, address(identityContract), _identityApprover, _identityLevel, _erc20Contract, _granularity);
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
