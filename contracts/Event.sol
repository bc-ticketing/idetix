// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Identity.sol";
import { IdetixLibrary } from "../libraries/IdetixLibrary.sol";

contract Event {
    using SafeMath for uint256;
    using SafeMath for uint8;

    event EventMetadata(bytes1 hashFunction, bytes1 size, bytes32 digest);
    event TicketMetadata(uint256 indexed ticketTypeId, bytes1 hashFunction, bytes1 size, bytes32 digest);
    event ValueTransferred(address indexed sender, address indexed receiver, uint256 amount, address erc20contract);

    mapping (uint256 => address) public nfOwners;

    function ownerOf(uint256 _id) public view returns (address) {
        return nfOwners[_id];
    }

    function isExistingType(uint256 _id) public view returns(bool){
        if (IdetixLibrary.isNonFungible(_id)) return (getNonce(_id) <= nfNonce);
        else return (getNonce(_id) <= fNonce);
    }
    function getNonce(uint256 _id) private pure returns(uint256){
        return (~IdetixLibrary.TYPE_NF_BIT & _id) >> 128;
    }

    address payable public owner;
    uint256 public nfNonce;
    uint256 public fNonce;
    mapping(uint256 => TicketType) public ticketTypeMeta;
    mapping(address => uint256) totalTickets;
    uint256 public maxTicketsPerPerson = 4;
    uint8 affiliatesPercentage = 10;

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

    /**
    * @param finalizationTime is time in seconds(!) since the last unix epoch
    */
    struct TicketType {
        uint256 price;
        uint256 finalizationTime;
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
    * @dev Creating a number ticket types with meta information.
    * Information not needed for the smart contract are stored as an IPFS multihash.
    * The ticket type is stored in the upper 128 bits.
    * Returns the ticket type since it is also used in the presale smart contract.
    * The length of all arrays must be the same.
    */
    function createTypes(
        bytes1[] memory _hashFunctions,
        bytes1[] memory _sizes,
        bytes32[] memory _digests,
        bool[] memory _isNFs,
        uint256[] memory _prices,
        uint256[] memory _finalizationTimes,
        uint256[] memory _initialSupplys
    )
        onlyEventOwner()
        public
        returns(uint256[] memory)
    {
        uint256[] memory _ticketTypes = new uint256[](_prices.length);
        for(uint256 i = 0; i<_prices.length; i++){
            _ticketTypes[i] = createType(_hashFunctions[i], _sizes[i], _digests[i], _isNFs[i], _prices[i], _finalizationTimes[i], _initialSupplys[i]);
        }
        return _ticketTypes;
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
        uint256 _finalizationTime,
        uint256 _initialSupply
    )
        onlyEventOwner()
        internal
        returns(uint256 _ticketType)
    {
        // Set a flag if this is an NFI.
        if (_isNF){
            _ticketType = (++nfNonce << 128);
            _ticketType = _ticketType | IdetixLibrary.TYPE_NF_BIT;
        }else{
            _ticketType = (++fNonce << 128);
        }

        ticketTypeMeta[_ticketType] = TicketType(_price, _finalizationTime, _initialSupply, 0);
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

    function transferValue(address _sender, address _receiver, uint256 _amount) public {
        if(erc20Contract != address(0) ){
            if(_sender == address(this)) ERC20(erc20Contract).transfer(_receiver, _amount);
            else ERC20(erc20Contract).transferFrom(_sender, _receiver, _amount);
        }else if (_receiver != address(this)){
            payable(_receiver).transfer(_amount);
        }
        emit ValueTransferred(_sender, _receiver, _amount, erc20Contract);
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function calcPrice(uint256 _type, uint256 _quantity, uint8 _percentage) internal view returns(uint256){
        uint256 full = _quantity.mul(ticketTypeMeta[_type].price);
        uint256 fullPercentage = full.mul(_percentage);
        return fullPercentage.div(100);
    }
    
    // TODO update metadata ticket typeof
    
    // TODO update finalizationtime
    
    
    modifier onlyEventOwner(){
        require(msg.sender == owner);
        _;
    }

    // The requested amount of tickets exceeds the number of available tickets.
    modifier onlyLessThanTotalSupply(uint256 _type, uint256 _quantity){
        require(ticketTypeMeta[_type].ticketsSold + _quantity <= ticketTypeMeta[_type].supply, IdetixLibrary.badQuantity1);
        _;
    }

    // The requested amount of tickets exceeds the number of allowed tickets per person.
    modifier onlyLessThanMaxTickets(address buyer, uint256 _quantity){
        require(totalTickets[buyer] + _quantity <= maxTicketsPerPerson, IdetixLibrary.badQuantity2);
        _;
    }

    // The requested amount of tickets multiplied with the ticket price does not match with the sent value.
    modifier onlyCorrectValue(uint256 _type, uint256 _quantity, uint256 _value, uint8 percentage){
        if(erc20Contract == address(0)){
            require(_quantity.mul(ticketTypeMeta[_type].price).mul(percentage).div(100) == _value, IdetixLibrary.badValue1);
        }
        _;
    }

    // The sender has not been verified with the requested auth level.
    modifier onlyVerified(address _buyer){
        require(identityContract.getSecurityLevel(identityApprover, _buyer) >= identityLevel, IdetixLibrary.notVerified);
        _;
    }

    // The given NF index does not exist.
    modifier onlyValidNfId(uint256 _id){
        require(IdetixLibrary.getNonFungibleIndex(_id) <= ticketTypeMeta[IdetixLibrary.getBaseType(_id)].supply, IdetixLibrary.badId1);
        _;
    }

    // One of the tickets has already been minted.
    modifier onlyNonMintedNf(uint256 _id){
        require(nfOwners[_id] == address(0), IdetixLibrary.badId2);
    _;
    }

    // The ticket type must be non fungible.
    modifier onlyNonFungible(uint256 _id){
        require(IdetixLibrary.isNonFungible(_id), IdetixLibrary.notNf);
        _;
    }

    // The ticket type must be fungible.
    modifier onlyFungible(uint256 _id){
        require(IdetixLibrary.isFungible(_id), IdetixLibrary.notF);
        _;
    }

    // The given id is an actual ticket id. A ticket type is requested.
    // The given type has not been created yet.
    modifier onlyType(uint256 _id){
        require(IdetixLibrary.isType(_id), IdetixLibrary.badType2);
        require(isExistingType(_id), IdetixLibrary.badType1);
    _;
    }

    // The quantity exceeds the number of owned tickets
    modifier onlyLessThanOwned(address _address, uint256 _type, uint256 _quantity){
        require(tickets[_type][_address] >= _quantity, IdetixLibrary.badQuantity3);
        _;
    }

    // The sender does not own the non-fungible ticket.
    modifier onlyNfOwner(address _address, uint256 _id){
        require(nfOwners[_id] == _address, IdetixLibrary.badOwner1);
        _;
    }
}
