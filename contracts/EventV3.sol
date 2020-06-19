// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


contract EventV3 {
    using SafeMath for uint256;
    
    event EventMetadata(bytes1 hashFunction, bytes1 size, bytes32 digest);
    event TicketMetadata(uint256 indexed eventId, bytes1 hashFunction, bytes1 size, bytes32 digest);

    address payable public owner;
    uint256 nonce;
    mapping(uint256 => TicketType) public ticketTypeMeta;
    mapping(address => uint256) totalTickets;
    uint256 public maxTicketsPerPerson = 2;

    mapping (uint256 => mapping(address => uint256)) public tickets;
    
    struct TicketType {
        uint256 price;
        uint256 finalizationBlock;
        uint256 supply;
        bool isNF;
        uint256 ticketsSold;
    }
    
    constructor(address payable _owner, bytes1 _hashFunction, bytes1 _size, bytes32 _digest) public {
        owner = _owner;
        emit EventMetadata(_hashFunction, _size, _digest); // store the event details in the event log
    }
    
    function updateEventMetadata(bytes1 _hashFunction, bytes1 _size, bytes32 _digest) public //onlyEventOwner() 
    {
        emit EventMetadata(_hashFunction, _size, _digest);
    }
    
    function createType(
        bytes1 _hashFunction, 
        bytes1 _size, 
        bytes32 _digest,
        bool _isNF, 
        uint256 _price,
        uint256 _finalizationBlock,
        uint256 _initialSupply
        )
    external returns(uint256 _type) {
        ticketTypeMeta[_type] = TicketType(_price, _finalizationBlock, _initialSupply, _isNF, 0);
        emit TicketMetadata(nonce, _hashFunction, _size, _digest) ;
        nonce++;
    }

    function setMaxTicketsPerPerson(uint256 _quantity) public {
        maxTicketsPerPerson = _quantity;
    }
    
    
    // TODO increase supply
    
    // TODO update metadata ticket typeof
    
    // TODO update finalizationblock
    
    
    modifier onlyEventOwner(){
        require(msg.sender == owner);
        _;
    }
    
    modifier onlyCorrectValue(uint256 _type, uint256 _quantity){
        require(ticketTypeMeta[_type].ticketsSold + _quantity <= ticketTypeMeta[_type].supply, "The requested amount of tickets exceeds the number of available tickets.");
        _;
    }

    modifier onlyLessThanMaxTickets(address buyer, uint256 _quantity){
        require(totalTickets[buyer] + _quantity <= maxTicketsPerPerson, "The requested amount of tickets exceeds the number of allowed tickets per person.");
        _;
    }

    modifier onlyVerified(address buyer){
        require(true, "The sender has not been verified with the requested auth level.");
        _;
    }
}
