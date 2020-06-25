// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


contract EventV3 {
    using SafeMath for uint256;
    
    event EventMetadata(bytes1 hashFunction, bytes1 size, bytes32 digest);
    event TicketMetadata(uint256 indexed eventId, bytes1 hashFunction, bytes1 size, bytes32 digest);

    // Use a split bit implementation.
    // Store the type in the upper 128 bits..
    uint256 constant TYPE_MASK = uint256(uint128(~0)) << 128;

    // ..and the non-fungible index in the lower 128
    uint256 constant NF_INDEX_MASK = uint128(~0);

    // The top bit is a flag to tell if this is a NFI.
    uint256 constant TYPE_NF_BIT = 1 << 255;

    mapping (uint256 => address) public nfOwners;

    function isNonFungible(uint256 _id) public pure returns(bool) {
        return _id & TYPE_NF_BIT == TYPE_NF_BIT;
    }
    function isFungible(uint256 _id) public pure returns(bool) {
        return _id & TYPE_NF_BIT == 0;
    }
    function getNonFungibleIndex(uint256 _id) public pure returns(uint256) {
        return _id & NF_INDEX_MASK;
    }
    function getNonFungibleBaseType(uint256 _id) public pure returns(uint256) {
        return _id & TYPE_MASK;
    }
    function isNonFungibleBaseType(uint256 _id) public pure returns(bool) {
        // A base type has the NF bit but does not have an index.
        return (_id & TYPE_NF_BIT == TYPE_NF_BIT) && (_id & NF_INDEX_MASK == 0);
    }
    function isNonFungibleItem(uint256 _id) public pure returns(bool) {
        // A base type has the NF bit but does has an index.
        return (_id & TYPE_NF_BIT == TYPE_NF_BIT) && (_id & NF_INDEX_MASK != 0);
    }
    function ownerOf(uint256 _id) public view returns (address) {
        return nfOwners[_id];
    }

    address payable public owner;
    uint256 nonce;
    mapping(uint256 => TicketType) public ticketTypeMeta;
    mapping(address => uint256) totalTickets;
    uint256 public maxTicketsPerPerson = 2;
    uint256 public latestType;

    // type => owner => quantity
    mapping (uint256 => mapping(address => uint256)) public tickets;

    struct TicketType {
        uint256 price;
        uint256 finalizationBlock;
        uint256 supply;
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
//    onlyEventOwner()
    external {
        // Store the type in the upper 128 bits
        uint256 ticketType = (++nonce << 128);

        // Set a flag if this is an NFI.
        if (_isNF){
            ticketType = ticketType | TYPE_NF_BIT;
        }

        ticketTypeMeta[ticketType] = TicketType(_price, _finalizationBlock, _initialSupply, 0);
        emit TicketMetadata(ticketType, _hashFunction, _size, _digest);

        latestType = ticketType;
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

    modifier onlyVerified(address _buyer){
        require(true, "The sender has not been verified with the requested auth level.");
        _;
    }

    modifier onlyValidNfId(uint256 _id){
        require(getNonFungibleIndex(_id) < ticketTypeMeta[getNonFungibleBaseType(_id)].supply, "The given NF index does not exist.");
        _;
    }

    modifier onlyNonMintedNf(uint256 _id){
        require(getNonFungibleIndex(_id) < ticketTypeMeta[getNonFungibleBaseType(_id)].supply, "The given NF index does not exist.");
        require(nfOwners[_id] == address(0), "One of the tickets has already been minted.");
    _;
    }

    modifier onlyNonFungible(uint256 _id){
        require(isNonFungible(_id), "The ticket type must be non fungible.");
        _;
    }

    modifier onlyFungible(uint256 _id){
        require(isFungible(_id), "The ticket type must be fungible.");
        _;
    }
}
