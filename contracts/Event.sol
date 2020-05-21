// SPDX-License-Identifier: MIT

pragma solidity >=0.4.22 <0.7.0;
pragma experimental ABIEncoderV2; //allows returning a struct from a function

import "./FungibleTicketFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract Event {
    event IpfsCid(bytes1 hashFunction, bytes1 size, bytes32 digest);
    event FungibleTicketAdded(address);
    event AffliatesAdded(address[] addresses);
    event AffliatesRemoved(address[] addresses);

    address payable public owner;
    uint256 public eventId;
    address[] public fungibleTicketFactories;
    address[] public nonFungibleTicketFactories;
    
    mapping(address => uint) private affiliates;
    uint8 public affiliateCommission;

    /**
     * @dev ERC20 token address which is accepted for payments (address(0) for ETH)
     */
    address public erc20Address;

    constructor(address payable _owner, bytes1 _hashFunction, bytes1 _size, bytes32 _digest, address _erc20Address, uint8 _affiliateCommission) public {
        owner = _owner;
        erc20Address = _erc20Address;
        affiliateCommission = _affiliateCommission;
        emit IpfsCid(_hashFunction, _size, _digest);
    }

    function updateIpfsCid(bytes1 _hashFunction, bytes1 _size, bytes32 _digest) public onlyEventOwner(){
        emit IpfsCid(_hashFunction, _size, _digest);
    }
    
    /**
     * 
     * Tickets
     * 
     */

    function addFungibleTicketFactory(bytes1 _hashFunction, bytes1 _size, bytes32 _digest, uint256 _ticketPrice, uint256 _numberTickets) public onlyEventOwner(){
        FungibleTicketFactory newFungibleTicketFactory = new FungibleTicketFactory(
            _hashFunction,
            _size,
            _digest,
            _numberTickets,
            _ticketPrice
        );
        fungibleTicketFactories.push(address(newFungibleTicketFactory));
        emit FungibleTicketAdded(address(newFungibleTicketFactory));
    }
    
    
    /**
     * 
     * Affiliates
     * 
     */
    function setAffiliateComission(uint8 _commissionRate) public onlyEventOwner(){
        affiliateCommission = _commissionRate;
    }
    
    function addAffiliates(address[] memory _addresses) public onlyEventOwner(){
        for(uint i = 0; i < _addresses.length; i++){
            affiliates[_addresses[i]] = 1;
        }
        AffliatesAdded(_addresses);
    }
    
    function removeAffililates(address[] memory _addresses) public onlyEventOwner(){
        for(uint i = 0; i < _addresses.length; i++){
            delete affiliates[_addresses[i]];
        }
        AffliatesRemoved(_addresses);
    }
    
    function claimETHCommission() public onlyETHPayments() {
        (msg.sender).transfer(affiliates[msg.sender] - 1); // -1 is necessary as all affiliates are initialized with 1. We need this to check if an address is belongs to the affiliates
    }
    
    function claimERC20Comission() public onlyERC20Payments(){
        ERC20(erc20Address).transferFrom(address(this), msg.sender, getAffiliateCommision(msg.sender));
    }
    
    function addAffiliateCommission(address[] memory _affiliates, uint _amount) public{
        uint commission = ((_amount * affiliateCommission)/100)/_affiliates.length;
        for(uint i = 0; i < _affiliates.length; i++){
            affiliates[_affiliates[i]] += commission;
        }
    }


    
    /**
     * 
     * Getters
     * 
     */

    function getFunglibleTicketFactories() public view returns (address[] memory){
        return fungibleTicketFactories;
    }
    
    function getAffiliateCommision(address _affiliateAddress) public view returns(uint){
        return affiliates[_affiliateAddress] - 1; // -1 is necessary as all affiliates are initialized with 1. We need this to check if an address is belongs to the affiliates
    }
    
    /**
    * 
    * Modifiers
    * 
    */
    modifier onlyEventOwner(){
        require(msg.sender == owner);
        _;
    }
    
    modifier onlyERC20Payments(){
        require(erc20Address != address(0), "The event does not accept ETH payments.");
        _;
    }
    
    modifier onlyETHPayments(){
        require(erc20Address == address(0), "The event only accepts ETH payments.");
        _;
    }
    
    modifier onlyAffiliate(){
        require(affiliates[msg.sender] > 0, "The address is not an approved affiliate.");
        _;
    }
    
}
