// SPDX-License-Identifier: MIT


pragma solidity >=0.4.22 <0.7.0;
pragma experimental ABIEncoderV2; //allows returning a struct from a function

//import "./FungibleTicketFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// "0x2e0640A9D4E3754F91fFDCC9CDfeC4c8b2EF8aF7","0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000",10
// "0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000",10,3,1
// "0","1",["0x397E598a7DeB2b2c229A095055F6b2ef98cC9071"]
// "0xBfcE6Cc0aA9950427576bD2114E1e3eBf629C562", "0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000",10,1000000000000000000, 10


contract EventV2 {
    event IpfsCid(bytes1 hashFunction, bytes1 size, bytes32 digest);
    event FungibleTicketFactoryCreated(uint indexed factoryId, bytes1 hashFunction, bytes1 size, bytes32 digest);
    event FungibleTicketAdded(address);
    event AffliatesAdded(address[] addresses);
    event AffliatesRemoved(address[] addresses);

    address payable public owner;
    uint256 public eventId;
    mapping(uint => FungibleTicketFactory) public fungibleTicketFactories;
    uint fungibleTicketFactoryIndex;

    mapping(address => uint) private affiliates;
    uint8 public affiliateCommission;

    /**
     * @dev ERC20 token address which is accepted for payments (address(0) for ETH)
     */
    address public erc20Address;
    
    uint ownerBalance;
    
    struct QueuedUser{
        address payable userAddress;
        uint numberTickets;
    }
    
    struct FungibleTicketFactory{
        uint256 numberTickets;
        uint256 ticketPrice;
        uint8 maxTicketsPerPerson;
        uint256 ticketsForSale;
    
    
        // parameters for secondary market logic
        uint256 sellingQueueHead;
        uint256 sellingQueueTail;
        uint256 buyingQueueHead;
        uint256 buyingQueueTail;
        
        mapping(address => uint) tickets;
        mapping(uint256 => QueuedUser) sellingQueue;
        mapping(uint256 => QueuedUser) buyingQueue;
    }

    constructor(address payable _owner, bytes1 _hashFunction, bytes1 _size, bytes32 _digest, address _erc20Address, uint8 _affiliateCommission) public {
        owner = _owner;
        erc20Address = _erc20Address;
        affiliateCommission = _affiliateCommission;
        fungibleTicketFactoryIndex = 0;
        ownerBalance = 0;
        emit IpfsCid(_hashFunction, _size, _digest);
    }

    function updateIpfsCid(bytes1 _hashFunction, bytes1 _size, bytes32 _digest) public //onlyEventOwner()
    {
        emit IpfsCid(_hashFunction, _size, _digest);
    }
    
    /**
     * 
     * Tickets
     * 
     */

    function addFungibleTicketFactory(bytes1 _hashFunction, bytes1 _size, bytes32 _digest, uint256 _ticketPrice, uint256 _numberTickets, uint8 _maxTicketsPerPerson) public 
    //onlyEventOwner()
    {
        fungibleTicketFactories[fungibleTicketFactoryIndex] = FungibleTicketFactory({
            numberTickets:_numberTickets,
            ticketPrice:_ticketPrice,
            maxTicketsPerPerson:_maxTicketsPerPerson,
            ticketsForSale:_numberTickets,
            sellingQueueHead:0,
            sellingQueueTail:1,
            buyingQueueHead:0,
            buyingQueueTail:0
        });

        // put the event owner on the top of the selling queue
        fungibleTicketFactories[fungibleTicketFactoryIndex].sellingQueue[0] = QueuedUser(owner, _numberTickets);
        
        emit FungibleTicketFactoryCreated(fungibleTicketFactoryIndex, _hashFunction, _size, _digest);
        fungibleTicketFactoryIndex += 1;
    }
    
    function buyFungibleTickets(uint _ticketFactoryId, uint _numTickets, address[] memory _affiliates) 
        public 
        payable 
        onlyVerifiedAccounts()
        onlyLessThanMaxTickets(fungibleTicketFactories[_ticketFactoryId].maxTicketsPerPerson, _numTickets)
        //checkTicketBalance()
    {
        FungibleTicketFactory storage ftf = fungibleTicketFactories[_ticketFactoryId];
        
        if(erc20Address == address(0)){
            require(msg.value == ftf.ticketPrice * _numTickets, "The value does not match the ticket price.");
        }
        uint commission = 0;
    
        // affiliate commission
        if(_affiliates.length > 0){
            commission = ((ftf.ticketPrice * _numTickets * affiliateCommission)/100)/_affiliates.length;
            for(uint i = 0; i < _affiliates.length; i++){
                affiliates[_affiliates[i]] += commission;
            }
        }
        
        // transfer ownership
        while(_numTickets > 0){
            address payable sellerAddress = popNextTicketForSale(ftf);
            
            require(sellerAddress != address(0), "Not enough tickets for sale. Join the buying queue instead.");
            
            ftf.tickets[msg.sender] += 1;
            _numTickets -= 1;
            
    
            if(erc20Address == address(0)){
                //require(msg.value == ftf.ticketPrice * _numTickets, "The value does not match the ticket price.");
                (sellerAddress).transfer(ftf.ticketPrice - commission);
            }else{
                require(ERC20(erc20Address).balanceOf(msg.sender) >= ftf.ticketPrice, "The account does not own enough ERC20 tokens for buying a ticket.");
                ERC20(erc20Address).transferFrom(msg.sender, sellerAddress, ftf.ticketPrice - commission);
            }
        }
        
        // pay commissions in ERC20 to smart contract
        if(erc20Address != address(0)){
            ERC20(erc20Address).transferFrom(msg.sender, address(this), commission * _numTickets);
        }
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



    
    function getAffiliateCommision(address _affiliateAddress) public view returns(uint){
        return affiliates[_affiliateAddress] - 1; // -1 is necessary as all affiliates are initialized with 1. We need this to check if an address is belongs to the affiliates
    }
    
    function popNextTicketForSale(FungibleTicketFactory storage _ftf) internal returns(address payable _sellerAddress){
        uint i = _ftf.sellingQueueHead;
        while(i < _ftf.sellingQueueTail){
            if(_ftf.sellingQueue[i].userAddress != address(0)){
                
                // remove a ticket from the seller
                _sellerAddress = _ftf.sellingQueue[i].userAddress;
                _ftf.sellingQueue[i].numberTickets -= 1;
                
                // remove from seller from queue if he has no more tickets to sell
                if(_ftf.sellingQueue[i].numberTickets == 0){
                    delete (_ftf.sellingQueue[i]);
                    _ftf.sellingQueueHead += 1;
                }
                return _sellerAddress;                
            }
            i -= 1;
        }
        return address(0);
    }
    
    function getNextSellerAddress(uint _ticketFactoryId) public view returns( address){
        FungibleTicketFactory storage ftf = fungibleTicketFactories[_ticketFactoryId];
        
        return ftf.sellingQueue[ftf.buyingQueueHead].userAddress;
        
    }
    
    function getNumTickets(uint _ticketFactoryId, address _address) public view returns(uint ){
        FungibleTicketFactory storage ftf = fungibleTicketFactories[_ticketFactoryId];
        return ftf.tickets[_address];
    }
    

    
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
    
    modifier onlyCorrectETHTicketPrice(uint _ticketPrice){
        require(msg.value == _ticketPrice, "The value does not match the ticket price.");
        _;
    }
    
    modifier ticketsAvailableFromHost(uint ticketsSold, uint ticketsAvailable){
        require(ticketsSold < ticketsAvailable, "All tickets are sold from the event host. Try the selling queue.");
        _;
    }

    
    modifier hasERC20Balance(uint _ticketPrice){
        require(ERC20(erc20Address).balanceOf(msg.sender) >= _ticketPrice, "The account does not own enough ERC20 tokens for buying a ticket.");
        _;
    }
    
    modifier onlyLessThanMaxTickets(uint _maxAmount, uint _amount){
        require(_maxAmount >= _amount, "The requested amount of ticket exeeds the amount of maximum allowed tickets per person.");
        _;
    }
    
    // TODO link to identity contract
    modifier onlyVerifiedAccounts(){
        require(true == true, "Only verified accounts");
        _;
    }
    
}
