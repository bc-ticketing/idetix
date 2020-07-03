// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
import './EventV3.sol';

abstract contract Aftermarket is EventV3{
    
    event TicketTransferred(address indexed seller, address indexed buyer, uint256 ticketType);
    
    mapping(uint256 => Queue) public buyingQueue;
    mapping(uint256 => Queue) public sellingQueue;
    mapping(uint256 => address payable) public nfTickets;

    /**
    * @dev Object represents a basic queue.
    * New objects are added to the tail of the queue.
    * Objects are removed from the head.
    *
    */
    struct Queue{
        uint256 head;
        uint256 tail;
        mapping(uint256 => QueuedUser) queue;
        uint256 numberTickets;
    }

    /**
    * @dev Object that is placed in the queues to indicate a buying or selling offer.
    *
    */
    struct QueuedUser{
        address payable userAddress;
        uint256 numberTickets;
    }

    /**
     * @dev Interested buyers enqueue to show their interest in buying a ticket for a specific type.
     * Can be used for fungible and non fungible tickets.
     * The value is locked in the smart contract.
     * A seller automatically sells the ticket of the given type to the person on the head of the queue.
     * One cannot queue up for a specific NF ticket id (only enqueue for a type of NF).
     *
     * Requirements:
     *
     * - type cannot be an id.
     * - value must match the number of tickets multiplied by the ticket price
     * - quantity must not exceed number of allowed tickets.
     *
     */
    function makeBuyOrder(uint256 _type, uint256 _quantity)
        public payable
        onlyType(_type)
        onlyCorrectValue(_type, _quantity, msg.value)
        onlyLessThanMaxTickets(msg.sender, _quantity)
    {
        buyingQueue[_type].queue[buyingQueue[_type].tail] = QueuedUser(msg.sender, _quantity);
        buyingQueue[_type].tail++;
        buyingQueue[_type].numberTickets += _quantity;
    }

    /**
     * @dev Owners of fungible tickets can queue up for selling their tickets.
     * Non-fungible tickets cannot be added to the queue.
     * Non-fungible tickets must be sold separately as they are unique.
     *
     * Requirements:
     *
     * - type must be fungible.
     * - quantity must not exceed number of owned tickets.
     *
     */
    function makeSellOrderFungibles(uint256 _type, uint256 _quantity)
        public
        onlyFungible(_type)
        onlyType(_type)
        onlyLessThanOwned(msg.sender, _type, _quantity)
    {
        sellingQueue[_type].queue[sellingQueue[_type].tail] = QueuedUser(msg.sender, _quantity);
        sellingQueue[_type].tail++;
        sellingQueue[_type].numberTickets += _quantity;
    }

    /**
     * @dev Selling a fungible ticket to the aftermarket.
     * The buyer is automatically the person at the head of the buying queue.
     * The value is transferred directly to previous ticket owner.
     * The ownership is directly transferred to the buyer.
     *
     *
     * Requirements:
     *
     * - type must be fungible.
     * - type cannot be an id.
     * - quantity must not exceed number of owned tickets.
     * - buying queue must not be empty.
     *
     */
    function fillBuyOrderFungibles(uint256 _type, uint256 _quantity)
        public
        onlyFungible(_type)
        onlyType(_type)
        onlyLessThanOwned(msg.sender, _type, _quantity)
    {
        while(_quantity > 0){
            address payable buyer = popQueueUser(buyingQueue[_type]);
            
            require(buyer != address(0), "No buyer found. Join the selling queue instead.");
            //TODO join sellingQueue instead

            transfer(buyer, msg.sender, _type);

            _quantity -= 1;
        }
    }


    /**
     * @dev Buying a fungible ticket from the aftermarket meaning directly from another ticket owner.
     * The seller is automatically the person at the head of the selling queue.
     * The value is transferred directly to previous ticket owner.
     * The ownership is directly transferred to msg.sender.
     *
     *
     * Requirements:
     *
     * - type must be fungible.
     * - type cannot be an id.
     * - value must match the number of tickets multiplied by the ticket price
     * - quantity must not exceed number of allowed tickets.
     * - selling queue must not be empty.
     * - buyer (msg.sender) must be verified.
     *
     */
    function fillSellOrderFungibles(uint256 _type, uint256 _quantity)
        public payable
        onlyType(_type)
        onlyFungible(_type)
        onlyCorrectValue(_type, _quantity, msg.value)
        onlyLessThanMaxTickets(msg.sender, _quantity)
        onlyVerified(msg.sender)
    {
        while(_quantity > 0){
            address payable seller = popQueueUser(sellingQueue[_type]);
            
            require(seller != address(0), "No seller found. Join the buying queue instead.");
            //TODO join buyingQueue instead

            transfer(msg.sender, seller, _type);
            _quantity -= 1;
        }
    }


    /**
     * @dev Selling a ticket to the aftermarket.
     * The buyer is automatically the person at the head of the buying queue.
     * The value is transferred directly to previous ticket owner.
     * The ownership is directly transferred to the buyer.
     *
     *
     * Requirements:
     *
     * - quantity must not exceed number of owned tickets.
     * - buying queue must not be empty.
     * - all ids must be non-fungible.
     *
     */
    function fillBuyOrderNonFungibles(uint256[] memory _ids)
        public
    {
        for(uint256 i = 0; i < _ids.length; i++){
            fillNonFungible(_ids[i]);
        }
    }

    function fillNonFungible(uint256 _id)
        private
        onlyNonFungible(_id)
    {
        //get head of buyingQueue
        uint256 _type = getBaseType(_id);
        address payable buyer = popQueueUser(buyingQueue[_type]);
        require(buyer != address(0), "No buyer found. Post ticket for sale instead");

        //TODO try/catch since buyer must already own enough tickets in the meantime
        transfer(buyer, msg.sender, _id);

        //TODO check if next buyer same address -> if true only make one tx
    }


    /**
     * @dev Posting non-fungible tickets for sale as a batch transfer.
     * This is only possible when the buying queue for that ticket type is empty, due to the black market attack.
     *
     *
     * Requirements:
     *
     * - only the owner of the tickets can post it for sale.
     * - buying queue must be empty.
     * - must be a non-fungible ticket
     *
     */
    function makeSellOfferNonFungibles(uint256[] memory _ids)
        public
    {
        for(uint256 i = 0; i < _ids.length; i++){
            makeSellOfferNonFungible(_ids[i]);
        }
    }

    /**
     * @dev Facilitates a single NF ticket selling.
     *
     *
     * Requirements:
     *
     * - only the owner of the ticket can post it for sale.
     * - buying queue must be empty.
     * - must be a non-fungible ticket
     *
     */
    function makeSellOfferNonFungible(uint256 _id)
        private
        onlyWhenQueueEmpty(buyingQueue[getBaseType(_id)])
        onlyNfOwner(msg.sender, _id)
        onlyNonFungible(_id)
    {
        nfTickets[_id] = msg.sender;
    }

    /**
     * @dev Fills the NF sellings as a batch transfer.
     * Executes the ownership and value transfer.
     *
     * Requirements:
     *
     * - only the owner of the ticket can post it for sale.
     * - buying queue must be empty.
     * - must be a non-fungible ticket
     *
     */
    function fillSellOrderNonFungibles(uint256[] memory _ids)
        public
        payable
        onlyVerified(msg.sender)
    {
        for(uint256 i = 0; i < _ids.length; i++){
            fillSellOrderNonFungible(_ids[i]);
        }
    }

    /**
     * @dev Fills the NF sellings as a batch transfer.
     * Executes the ownership and value transfer.
     *
     * Requirements:
     *
     * - only the owner of the ticket can post it for sale.
     * - buying queue must be empty.
     * - must be a non-fungible ticket
     *
     */
    function fillSellOrderNonFungible(uint256 _id)
        private
        onlyForSale(_id)
    {
        transfer(msg.sender, nfTickets[_id], _id);
    }

    function transfer(address _buyer, address payable _seller, uint256 _id)
        private
        onlyLessThanMaxTickets(_buyer, 1)
    {
        //transfer ownership
        uint256 _type = getBaseType(_id);
        tickets[_type][_buyer] += 1;
        tickets[_type][_seller] -= 1;
        totalTickets[_buyer] += 1;
        totalTickets[_seller] -= 1;
        if (isNonFungible(_id)) nfOwners[_id] = _buyer;

        //transfer value
        _seller.transfer(ticketTypeMeta[_type].price);

        emit TicketTransferred(_seller, _buyer, _type);
    }

    /**
    * @dev Finds the next user in the queue and removes it.
    * The head pointer is updated.
    * Users that left the queue are ignored.
    * Returns address(0) if no user is in the queue.
    *
    */
    function popQueueUser(Queue storage _queue) internal returns(address payable _address){
        uint256 i = _queue.head;
        while(i < _queue.tail){
            if(_queue.queue[i].userAddress != address(0)){
                
                // remove a ticket from the seller
                _address = _queue.queue[i].userAddress;
                _queue.queue[i].numberTickets--;

                // remove a ticket from the queue counter
                _queue.numberTickets -= 1;
                
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


    /**
    * @dev Returns the number of tickets that are present in the selling queue for a given type.
    *
    */
    function getNumberOfTicketsForSale(uint256 _type)
        public
        view
        onlyType(_type)
        returns(uint256)
    {
        return sellingQueue[_type].numberTickets;
    }

    /**
    * @dev Returns the number of tickets that are present in the buying queue for a given type.
    *
    */
    function getNumberOfTicketOffers(uint256 _type)
        public
        view
        onlyType(_type)
        returns(uint256)
    {
        return buyingQueue[_type].numberTickets;
    }

    modifier onlyWhenQueueEmpty(Queue memory _queue){
        require(_queue.numberTickets == 0, "One cannot sell a ticket if people are in the buying queue.");
        _;
    }

    modifier onlyForSale(uint256 _id){
        require(nfTickets[_id] != address(0), "This ticket is not for sale.");
        _;
    }
}
