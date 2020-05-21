// SPDX-License-Identifier: MIT


pragma solidity >=0.4.22 <0.7.0;

import './Event.sol';
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

//"0xBfcE6Cc0aA9950427576bD2114E1e3eBf629C562", "0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000",1,1000000000000000000


contract FungibleTicketFactory {
    /**
    * 
    * Events
    * 
    */ 
    event IpfsCid(bytes1 hashFunction, bytes1 size, bytes32 digest);     // stores the metadata of the event
    event TicketBought(address indexed addr);
    event TicketSold(address indexed addr);
    event BuyingQueueJoined(address indexed addr);
    event SellingQueueJoined(address indexed addr);
    event BuyingQueueLeft(address indexed addr);
    event SellingQueueLeft(address indexed addr);
    

    // ticket details
    uint256 public numberTickets;
    uint256 public ticketPrice;
    uint256 public maxTicketsPerPerson;

    Event parentEvent;

    uint256 public ticketIndex;
    mapping(address => uint) public tickets;


    // parameters for secondary market logic
    uint256 public sellingQueueHead;
    uint256 public sellingQueueTail;
    uint256 public buyingQueueHead;
    uint256 public buyingQueueTail;

    mapping(uint256 => address payable) public sellingQueue;
    mapping(uint256 => address payable) public buyingQueue;


    constructor(
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        uint256 _numberTickets,
        uint256 _ticketPrice
    )
        public
    {
        parentEvent = Event(msg.sender);
        
        // todo check if address is really an Event contract address
        
        ticketIndex = 0;

        numberTickets = _numberTickets;
        ticketPrice = _ticketPrice;

        sellingQueueHead = 0;
        sellingQueueTail = 0;
        buyingQueueHead = 0;
        buyingQueueTail = 0;
        

        emit IpfsCid(
             _hashFunction,
             _size,
             _digest
        );
    }
    
    function buyTicketWithETH(address[] memory _affiliates) public{
        //TODO only event contract
        if(ticketIndex < numberTickets){
            issueFungibleTicket(msg.sender);
            (parentEvent.owner()).transfer(ticketPrice);
        }
        
        // if people want to sell tickets, the buyer automatically buys from the first seller (sellingQueueHead)
        else{
            (address sellerAddress, uint newSellingQueueHead) = getNextAddressInSellingQueue();
            require(sellerAddress != address(0), "No ticekts are for sale. Join the buying queue instead.");

            // transfer money
            (sellingQueue[newSellingQueueHead]).transfer(ticketPrice);

            // transfer ownership
            // remove current ticket owner
            delete tickets[sellingQueue[newSellingQueueHead]];
            // add new ticket owner
            tickets[msg.sender] = 1;

            // remove user from the queue
            delete sellingQueue[newSellingQueueHead];
            
            sellingQueueHead = newSellingQueueHead + 1;
        }
        
        parentEvent.addAffiliateCommission(_affiliates, ticketPrice);
        
        emit TicketBought(msg.sender);
    }
    
    function buyTicketWithERC20() public onlyVerifiedAccounts() onlyERC20Payments() hasERC20Balance(){
        if(ticketIndex < numberTickets){
            issueFungibleTicket(msg.sender);
            ERC20(parentEvent.erc20Address()).transferFrom(msg.sender, parentEvent.owner(), ticketPrice);
        }
        
        // if people want to sell tickets, the buyer automatically buys from the first seller (sellingQueueHead)
        else{
            (address sellerAddress, uint newSellingQueueHead) = getNextAddressInSellingQueue();
            require(sellerAddress != address(0), "No ticekts are for sale. Join the buying queue instead.");
            
            // transfer money
            ERC20(parentEvent.erc20Address()).transferFrom(msg.sender, sellerAddress, ticketPrice);
    
            // transfer ownership
            // remove current ticket owner
            delete tickets[sellingQueue[newSellingQueueHead]];
            // add new ticket owner
            tickets[msg.sender] = 1;
    
            // remove user from the queue
            delete sellingQueue[newSellingQueueHead];            
            
            sellingQueueHead = newSellingQueueHead + 1;
        }
        emit TicketBought(msg.sender);
    }
    
    function issueFungibleTicket(address payable _ticketOwner) internal {
        // issue the ticket
        tickets[_ticketOwner] = 1;
        ticketIndex++;
    }


    function joinBuyingQueueWithETH() public payable onlyVerifiedAccounts() onlyETHPayments() onlyCorrectETHTicketPrice(){
        buyingQueue[buyingQueueTail] = msg.sender;
        buyingQueueTail++;
        emit BuyingQueueJoined(msg.sender);
    }
    
    function joinBuyingQueueWithERC20() public onlyVerifiedAccounts() onlyERC20Payments() hasERC20Balance(){
        ERC20(parentEvent.erc20Address()).transferFrom(msg.sender, address(this), ticketPrice); //Send ERC20 tokens to this contract
        buyingQueue[buyingQueueTail] = msg.sender;
        buyingQueueTail++;
        emit BuyingQueueJoined(msg.sender);
    }

    function sellFungibleTicket() public onlyTicketOwners(){
        // if people are in the waiting queue for buying tickets
        (address buyerAddress, uint newBuyingQueueHead) = getNextAddressInBuyingQueue();
        if(buyerAddress != address(0)){
            
            // transfer money
            if (parentEvent.erc20Address() == address(0)){
                (msg.sender).transfer(ticketPrice);

            }else{
                ERC20(parentEvent.erc20Address()).transfer(msg.sender, ticketPrice);
            }

            // transfer ownership
            tickets[buyerAddress] = 1;
            delete tickets[msg.sender];

            // remove user from the queue
            delete buyingQueue[buyingQueueHead];
            buyingQueueHead = newBuyingQueueHead + 1;
            emit TicketSold(msg.sender);
        }

        // else join selling queue
        else{
            sellingQueue[sellingQueueTail] = msg.sender;
            sellingQueueTail++;
            emit SellingQueueJoined(msg.sender);
        }
    }
    
    function exitSellingQueue() public{
        for(uint256 i = sellingQueueHead; i < sellingQueueTail; i++){
            if(sellingQueue[i] == msg.sender){
                delete sellingQueue[i];
                emit SellingQueueLeft(msg.sender);
                break;
            }
        }
    }
    
    function exitBuyingQueue() public {
        for(uint256 i = buyingQueueHead; i < buyingQueueTail; i++){
            if(buyingQueue[i] == msg.sender){
                // delete posistion in the queue(same as: sellingQueue[i] == address(0);)
                delete buyingQueue[i];
                
                // refund deposit
                (msg.sender).transfer(ticketPrice);
                
                emit BuyingQueueLeft(msg.sender);
                break;
            }
        }
    }
    
    
    /**
     *
     * Getters
     * 
     */
    
    function hasTicket(address _address) public view returns(bool){
        if(tickets[_address] >= 1){
            return true;
        }else{
            return false;
        }
    }
    
    function getNextAddressInBuyingQueue() internal view returns(address buyerAddress, uint newBuyingQueueHead){
        uint i = buyingQueueHead;
        while(i < buyingQueueTail){
            if(buyingQueue[i] != address(0)){
                return (buyingQueue[i], i);
            }
        }
        return (address(0), 0);
    }
    
    function getNextAddressInSellingQueue() internal view returns(address sellerAddress, uint newSellingQueueHead){
        uint i = sellingQueueHead;
        while(i < sellingQueueTail){
            if(sellingQueue[i] != address(0)){
                return (sellingQueue[i], i);
            }
        }
        return (address(0), 0);
    }
    
    
    function getEventOwner() public view returns(address payable){
        return parentEvent.owner();
    }
    
    
    /**
     * 
     * Modifiers 
     * 
     */
    
    // TODO link to identity contract
    modifier onlyVerifiedAccounts(){
        require(true == true, "Only verified accounts");
        _;
    }
    
    modifier onlyTicketOwners(){
        require(tickets[msg.sender] >= 1, "The sender does NOT own a ticket of this kind.");
        _;
    }

    modifier onlyERC20Payments(){
        require(parentEvent.erc20Address() != address(0), "The event does not accept ETH payments.");
        _;
    }
    
    modifier onlyETHPayments(){
        require(parentEvent.erc20Address() == address(0), "The event only accepts ETH payments.");
        _;
    }
    
    modifier onlyCorrectETHTicketPrice(){
        require(msg.value == ticketPrice, "The value does not match the ticket price.");
        _;
    }
    
    modifier hasERC20Balance(){
        require(ERC20(parentEvent.erc20Address()).balanceOf(msg.sender) >= ticketPrice, "The account does not own enough ERC20 tokens for buying a ticket.");
        _;
    }
}