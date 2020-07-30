// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Identity.sol";

contract Event {
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
    function getBaseType(uint256 _id) public pure returns(uint256) {
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
    function isType(uint256 _id) public pure returns(bool){
        return (_id & NF_INDEX_MASK == 0);
    }
    function isExistingType(uint256 _id) public view returns(bool){
        if (isNonFungible(_id)) return (getNonce(_id) <= nfNonce);
        else return (getNonce(_id) <= fNonce);
    }
    function getNonce(uint256 _id) private pure returns(uint256){
        return (~TYPE_NF_BIT & _id) >> 128;
    }

    address payable public owner;
    uint256 public nfNonce;
    uint256 public fNonce;
    mapping(uint256 => TicketType) public ticketTypeMeta;
    mapping(address => uint256) totalTickets;
    uint256 public maxTicketsPerPerson = 4;

    // type => owner => quantity
    mapping (uint256 => mapping(address => uint256)) public tickets;

    /**
    * Defines the currency that is used to pay for tickets.
    * If set to address(0), then ETH is used as a mean of payment
    *
    */
    address public erc20Contract;

    // identity approver address => level
    Identity public identityContract;
    address public identityApprover;
    uint8 public identityLevel;


    struct TicketType {
        uint256 price;
        uint256 finalizationBlock;
        uint256 supply;
        uint256 ticketsSold;
    }
    
    constructor(
        address payable _owner,
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        address _identityContract,
        address _identityApprover,
        uint8 _identityLevel,
        address _erc20Contract
    ) public {
        owner = _owner;
        identityContract = Identity(_identityContract);
        identityApprover = _identityApprover;
        identityLevel = _identityLevel;
        erc20Contract = _erc20Contract;
        emit EventMetadata(_hashFunction, _size, _digest); // store the event details in the event log
    }
    
    function updateEventMetadata(bytes1 _hashFunction, bytes1 _size, bytes32 _digest)
        public
        onlyEventOwner()
    {
        emit EventMetadata(_hashFunction, _size, _digest);
    }


    /**
    * @dev Creating a ticket type with meta information.
    * Information not needed for the smart contract are stored as an IPFS multihash.
    * The ticket type is stored in the upper 128 bits.
    * Returns the ticket type since it is also used in the presale smart contract.
    *
    */
    function createType(
        bytes1 _hashFunction, 
        bytes1 _size, 
        bytes32 _digest,
        bool _isNF, 
        uint256 _price,
        uint256 _finalizationBlock,
        uint256 _initialSupply
    )
        onlyEventOwner()
        public
        returns(uint256 _ticketType)
    {
        // Set a flag if this is an NFI.
        if (_isNF){
            _ticketType = (++nfNonce << 128);
            _ticketType = _ticketType | TYPE_NF_BIT;
        }else{
            _ticketType = (++fNonce << 128);
        }

        ticketTypeMeta[_ticketType] = TicketType(_price, _finalizationBlock, _initialSupply, 0);
        emit TicketMetadata(_ticketType, _hashFunction, _size, _digest);
        return _ticketType;
    }

    function setMaxTicketsPerPerson(uint256 _quantity) public {
        maxTicketsPerPerson = _quantity;
    }
    
    function increaseSupply(uint256 _type, uint256 _addedSupply)
        public
        onlyEventOwner()
    {
        ticketTypeMeta[_type].supply = ticketTypeMeta[_type].supply.add(_addedSupply);
    }
    
    // TODO update metadata ticket typeof
    
    // TODO update finalizationblock
    
    
    modifier onlyEventOwner(){
        require(msg.sender == owner);
        _;
    }

    // The requested amount of tickets exceeds the number of available tickets.
    modifier onlyLessThanTotalSupply(uint256 _type, uint256 _quantity){
        require(ticketTypeMeta[_type].ticketsSold + _quantity <= ticketTypeMeta[_type].supply, "BadQuantity1");
        _;
    }

    // The requested amount of tickets exceeds the number of allowed tickets per person.
    modifier onlyLessThanMaxTickets(address buyer, uint256 _quantity){
        require(totalTickets[buyer] + _quantity <= maxTicketsPerPerson, "BadQuantity2");
        _;
    }

    // The requested amount of tickets multiplied with the ticket price does not match with the sent value.
    modifier onlyCorrectValue(uint256 _type, uint256 _quantity, uint256 _value){
        require(_quantity.mul(ticketTypeMeta[_type].price) == _value, "BadValue1");
        _;
    }

    // The sender has not been verified with the requested auth level.
    modifier onlyVerified(address _buyer){
        require(identityContract.getSecurityLevel(identityApprover, _buyer) >= identityLevel, "NotVerified");
        _;
    }

    // The given NF index does not exist.
    modifier onlyValidNfId(uint256 _id){
        require(getNonFungibleIndex(_id) <= ticketTypeMeta[getBaseType(_id)].supply, "BadId1");
        _;
    }

    // One of the tickets has already been minted.
    modifier onlyNonMintedNf(uint256 _id){
        require(nfOwners[_id] == address(0), "BadId2");
    _;
    }

    // The ticket type must be non fungible.
    modifier onlyNonFungible(uint256 _id){
        require(isNonFungible(_id), "NotNf");
        _;
    }

    // The ticket type must be fungible.
    modifier onlyFungible(uint256 _id){
        require(isFungible(_id), "NotF");
        _;
    }

    // The given id is an actual ticket id. A ticket type is requested.
    // The given type has not been created yet.
    modifier onlyType(uint256 _id){
        require(isType(_id), "BadId3");
        require(isExistingType(_id), "BadType");
    _;
    }

    // The quantity exceeds the number of owned tickets
    modifier onlyLessThanOwned(address _address, uint256 _id, uint256 _quantity){
        require(tickets[_id][_address] >= _quantity, "BadQuantity3");
        _;
    }

    // The sender does not own the non-fungible ticket.
    modifier onlyNfOwner(address _address, uint256 _id){
        require(nfOwners[_id] == _address, "BadOwner1");
        _;
    }
}
