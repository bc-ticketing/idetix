// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
import './EventV3.sol';

abstract contract Aftermarket is EventV3{
    
    event TicketTransferred(address indexed seller, address indexed buyer, uint256 ticketType);
    
    mapping(uint256 => Queue) public buyingQueue;
    mapping(uint256 => Queue) public sellingQueue;

    struct Queue{
        uint head;
        uint tail;
        mapping(uint256 => QueuedUser) queue;
    }
    
    struct QueuedUser{
        address payable userAddress;
        uint numberTickets;
    }
    
    function sellFungible(uint256 _ticketType, uint256 _quantity) public{
        while(_quantity > 0){
            address payable buyer = popQueueUser(buyingQueue[_ticketType]);
            
            require(buyer != address(0), "No buyer found. Join the selling queue instead.");

            
            tickets[_ticketType][buyer] += 1;
            tickets[_ticketType][msg.sender] -= 1;
            _quantity -= 1;

            (msg.sender).transfer(ticketTypeMeta[_ticketType].price);
        
            emit TicketTransferred(msg.sender, buyer, _ticketType);
        }
    }
    
    function buyFungible(uint256 _ticketType, uint256 _quantity) public payable{
        while(_quantity > 0){
            address payable seller = popQueueUser(sellingQueue[_ticketType]);
            
            require(seller != address(0), "No seller found. Join the buying queue instead.");
            
            tickets[_ticketType][msg.sender] += 1;
            tickets[_ticketType][seller] -= 1;
            _quantity -= 1;

            seller.transfer(ticketTypeMeta[_ticketType].price);
        
            emit TicketTransferred(seller, msg.sender, _ticketType);
        }
    }
    
    function joinBuyingQueue(uint256 _type, uint256 _quantity) public payable{
        // check amount
        // check quanity
        buyingQueue[_type].queue[buyingQueue[_type].tail] = QueuedUser(msg.sender, _quantity);
        buyingQueue[_type].tail++;
    }
    
    function joinSellingQueue(uint256 _type, uint256 _quantity) public {
        sellingQueue[_type].queue[sellingQueue[_type].tail] = QueuedUser(msg.sender, _quantity);
        sellingQueue[_type].tail++;
    }
    
    
    
    function popQueueUser(Queue storage _queue) internal returns(address payable _address){
        uint i = _queue.head;
        while(i < _queue.tail){
            if(_queue.queue[i].userAddress != address(0)){
                
                // remove a ticket from the seller
                _address = _queue.queue[i].userAddress;
                _queue.queue[i].numberTickets--;

                
                // remove from seller from queue if he has no more tickets to sell
                if(_queue.queue[i].numberTickets == 0){
                    delete (_queue.queue[i]);
                    _queue.head += 1;
                }
                return _address;                
            }
            i -= 1;
        }
        return address(0);
    }
    
    function ticketsForSale(uint256 _ticketType) view public returns(uint _quantity){
        for(uint256 i = sellingQueue[_ticketType].head; i <= sellingQueue[_ticketType].tail; i++){
            _quantity = _quantity.add(sellingQueue[_ticketType].queue[i].numberTickets);
        }
        return _quantity;
    }
}
