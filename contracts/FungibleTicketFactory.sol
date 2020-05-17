// SPDX-License-Identifier: MIT


pragma solidity >=0.4.22 <0.7.0;

import './Event.sol';

//"0xBfcE6Cc0aA9950427576bD2114E1e3eBf629C562", "0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000",1,1000000000000000000


contract FungibleTicketFactory {

    // stores the metadata of the event
    event IpfsCid(bytes1 hashFunction, bytes1 size, bytes32 digest);

    struct ticket{
        uint ticketId;
        address payable ticketOwner;
    }

    // ticket details
    uint256 public numberTickets;
    uint256 public ticketPriceWei;
    Event parentEvent;


    uint256 public ticketIndex;
    //mapping(address payable => uint8) public tickets;
    
    //address payable[] public ticketOwners;

    //mapping(address => uint8) public ticketOwners;

    // ticketId => ticketOwner
    mapping(uint => address) public tickets;

    // parameters for secondary market logic
    uint256 public sellingQueueHead;
    uint256 public sellingQueueTail;
    uint256 public buyingQueueHead;
    uint256 public buyingQueueTail;

    mapping(uint256 => ticket) public sellingQueue;
    mapping(uint256 => address payable) public buyingQueue;

    struct FTicket {
        uint256 id;
        address payable owner;
    }

    constructor(
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        uint256 _numberTickets,
        uint256 _ticketPriceWei
    )
        public
    {
        parentEvent = Event(msg.sender);
        
        // todo check if address is really an Event contract address
        
        ticketIndex = 0;

        numberTickets = _numberTickets;
        ticketPriceWei = _ticketPriceWei;

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

    function buyFungibleTicket() public payable{
        // TODO Check if msg.sender is has verified ID in verification smart contract
        require(msg.value == ticketPriceWei, "The value does not match the ticket price.");

        // if not all tickets have been issued, the buyer automatically buys from the event owner
        if(ticketIndex < numberTickets){
            issueFungibleTicket(msg.sender);
            return;
        }

        // if people want to sell tickets, the buyer automatically buys from the earliest seller
        (uint ticketId, address sellerAddress, uint newSellingQueueHead) = getNextAddressInSellingQueue();
        if( sellerAddress != address(0)){
            sellingQueueHead = newSellingQueueHead;
            buyFromSellingQueue(ticketId, msg.sender);
            sellingQueueHead++;
        }

        // if nobody wants to sell yet, the buyer joins the buying queue
        // money is stored in the smart contract
        else{
            joinBuyingQueue();
        }
    }


    function issueFungibleTicket(address payable _ticketOwner) internal {
        // issue the ticket
        tickets[ticketIndex] = _ticketOwner;

        ticketIndex++;

        // TODO send ticket price to the event owner or escrow service
        (parentEvent.getOwner()).transfer(msg.value);
    }


    function buyFromSellingQueue(uint _ticketId, address payable _newOwner) internal{
        // transfer money
        (sellingQueue[sellingQueueHead].ticketOwner).transfer(ticketPriceWei);

        // transfer ownership
        delete tickets[sellingQueue[sellingQueueHead].ticketId];
        tickets[_ticketId] = _newOwner;

        // remove user from the queue
        delete sellingQueue[sellingQueueHead];
    }

    function joinBuyingQueue() internal{
        buyingQueue[buyingQueueTail] = msg.sender;
        buyingQueueTail++;
    }

    function sellFungibleTicket(uint _ticketId) public{

        require(tickets[_ticketId] == msg.sender, "The sender does NOT own a ticket of this kind.");

        // if people are in the waiting queue for buying tickets
        (address buyerAddress, uint newBuyingQueueHead) = getNextAddressInBuyingQueue();
        if(buyerAddress != address(0)){
            // transfer money
            (msg.sender).transfer(ticketPriceWei);

            // transfer ownership
            tickets[_ticketId] = buyingQueue[newBuyingQueueHead];

            // remove user from the queue
            delete buyingQueue[buyingQueueHead];
            buyingQueueHead = newBuyingQueueHead + 1;
        }

        // else join selling queue
        else{
            sellingQueue[sellingQueueTail] = ticket({ticketId:_ticketId, ticketOwner:msg.sender});
            sellingQueueTail++;
        }
    }
    
    function exitSellingQueue() public{
        for(uint256 i = sellingQueueHead; i < sellingQueueTail; i++){
            if(sellingQueue[i].ticketOwner == msg.sender){
                delete sellingQueue[i];
                break;
            }
        }
    }
    
    function exitBuyingQueue() public {
        for(uint256 i = buyingQueueHead; i < buyingQueueTail; i++){
            if(buyingQueue[i] == msg.sender){
                
                // delete posistion in the queue
                // basically doing this: sellingQueue[i] == address(0);
                delete buyingQueue[i];
                
                
                // refund deposit
                (msg.sender).transfer(ticketPriceWei);
                
                break;
            }
        }
    }
    
    function getTicketId() public view returns(uint){
        for(uint i = 0; i < ticketIndex; i++){
            if(tickets[i] == msg.sender){
                return i;
            }
        }
        return 0;
    }
    
    function hasTicket(address _address) public view returns(bool){
        for(uint i = 0; i < ticketIndex; i++){
            if(tickets[i] == _address){
                return true;
            }
        }
        return false;
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
    
    function getNextAddressInSellingQueue() internal view returns(uint ticketId, address sellerAddress, uint newSellingQueueHead){
        uint i = sellingQueueHead;
        while(i < sellingQueueTail){
            if(sellingQueue[i].ticketOwner != address(0)){
                return (sellingQueue[i].ticketId, sellingQueue[i].ticketOwner, i);
            }
        }
        return (0, address(0), 0);
    }
    
    function getAllTicketOwners() public view returns(address[] memory _owners){
        _owners = new address[](ticketIndex);
        
        for(uint i = 0; i < ticketIndex; i++){
            _owners[i] = tickets[i];
        }
        
        return _owners;
    }
    
    function getEventOwner() public view returns(address payable){
        return parentEvent.getOwner();
    }
}