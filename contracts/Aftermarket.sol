// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
import './Event.sol';
pragma experimental ABIEncoderV2;

abstract contract Aftermarket is Event{
    
    event TicketTransferred(address indexed seller, address indexed buyer, uint256 ticketType);

    //type => percentage => queue
    mapping(uint256 => mapping(uint8 => Queue)) public buyingQueue;
    mapping(uint256 => mapping(uint8 => Queue)) public sellingQueue;

    /**
    * Non-fungible tickets that are posted for sale
    */
    mapping(uint256 => NfSellOrder) public nfTickets;
    mapping(uint256 => uint256) public totalInBuying;
    mapping(uint256 => uint256) public totalInSelling;

    uint8[9] allowedGranularities = [100, 50, 25, 20, 10, 5, 4, 2, 1];

    /**
    * @dev Defines how many queues exists.
    *
    */
    uint8 public granularity;


    /**
    * @dev Defines which percentages exists.
    * This mapping is created in the constructor and allows fast reads.
    * Could als be calculated dynamically, but transaction will cost more gas.
    * Especially with large granularity.
    *
    */
    mapping(uint8 => bool) public allowedPercentages;


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
        uint256 quantity;
    }

    struct NfSellOrder{
        address payable userAddress;
        uint8 percentage;
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
    function makeBuyOrder(uint256 _type, uint256 _quantity, uint8 _percentage)
        public payable
        onlyType(_type)
        onlyCorrectValue(_type, _quantity, msg.value)
        onlyLessThanMaxTickets(msg.sender, _quantity)
    {
        buyingQueue[_type][_percentage].queue[buyingQueue[_type][_percentage].tail] = QueuedUser(msg.sender, _quantity);
        buyingQueue[_type][_percentage].tail++;
        buyingQueue[_type][_percentage].numberTickets += _quantity;
        totalInBuying[_type] += 1;
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
    function makeSellOrderFungibles(uint256 _type, uint256 _quantity, uint8 _percentage)
        public
        onlyFungible(_type)
        onlyType(_type)
        onlyLessThanOwned(msg.sender, _type, _quantity)
    {
        sellingQueue[_type][_percentage].queue[sellingQueue[_type][_percentage].tail] = QueuedUser(msg.sender, _quantity);
        sellingQueue[_type][_percentage].tail++;
        sellingQueue[_type][_percentage].numberTickets += _quantity;
        totalInSelling[_type] += _quantity;
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
    function fillBuyOrderFungibles(uint256 _type, uint256 _quantity, uint8 _percentage)
        public
        onlyFungible(_type)
        onlyType(_type)
        onlyLessThanOwned(msg.sender, _type, _quantity)
    {
        while(_quantity > 0){
            address payable buyer = popQueueUser(buyingQueue[_type][_percentage]);
            
            require(buyer != address(0), "No buyer found. Join the selling queue instead.");
            //TODO join sellingQueue instead

            transfer(buyer, msg.sender, _type);

            totalInBuying[_type] -= _quantity;
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
    function fillSellOrderFungibles(uint256 _type, uint256 _quantity, uint8 _percentage)
        public payable
        onlyType(_type)
        onlyFungible(_type)
        onlyCorrectValue(_type, _quantity, msg.value)
        onlyLessThanMaxTickets(msg.sender, _quantity)
        onlyVerified(msg.sender)
    {
        while(_quantity > 0){
            address payable seller = popQueueUser(sellingQueue[_type][_percentage]);
            
            require(seller != address(0), "No seller found. Join the buying queue instead.");
            //TODO join buyingQueue instead
            totalInSelling[_type] -= _quantity;

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
    function fillBuyOrderNonFungibles(uint256[] memory _ids, uint8 _percentage)
        public
    {
        for(uint256 i = 0; i < _ids.length; i++){
            fillBuyOrderNonFungible(_ids[i], _percentage);
        }
    }

    function fillBuyOrderNonFungible(uint256 _id, uint8 _percentage)
        private
        onlyNonFungible(_id)
    {
        //get head of buyingQueue
        uint256 _type = getBaseType(_id);
        address payable buyer = popQueueUser(buyingQueue[_type][_percentage]);
        require(buyer != address(0), "No buyer found. Post ticket for sale instead");
        totalInBuying[_type] -= 1;

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
    function makeSellOrderNonFungibles(uint256[] memory _ids, uint8[] memory _percentages)
        public
    {
        for(uint256 i = 0; i < _ids.length; i++){
            makeSellOrderNonFungible(_ids[i], _percentages[i]);
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
    function makeSellOrderNonFungible(uint256 _id, uint8 _percentage)
        private
        onlyWhenQueueEmpty(totalInBuying[getBaseType(_id)])
        onlyNfOwner(msg.sender, _id)
        onlyNonFungible(_id)
    {
        nfTickets[_id] = NfSellOrder(msg.sender, _percentage);
        totalInSelling[getBaseType(_id)] += 1;
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
    function fillSellOrderNonFungibles(uint256[] memory _ids, uint8[] memory _percentages)
        public
        payable
        onlyVerified(msg.sender)
    {
        for(uint256 i = 0; i < _ids.length; i++){
            fillSellOrderNonFungible(_ids[i], _percentages[i]);
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
    function fillSellOrderNonFungible(uint256 _id, uint8 _percentage)
        private
        onlyForSale(_id)
        onlyCorrectPercentage(_id, _percentage)
    {
        totalInSelling[getBaseType(_id)] -= 1;
        transfer(msg.sender, nfTickets[_id].userAddress, _id);
    }

    /**
    *
    *
    */
    function withdrawBuyOrder(uint256 _type, uint256 _quantity, uint8 _percentage, uint256 _index)
        public
        onlyQueuedUserOwnerBuyingQueue(_type, _percentage, _index)
        onlyQueuedUserQuantityBuyingQueue(_type, _percentage, _index, _quantity)
    {
        buyingQueue[_type][_percentage].queue[_index].quantity -= _quantity;
        buyingQueue[_type][_percentage].numberTickets -= _quantity;

        if(buyingQueue[_type][_percentage].queue[_index].quantity==0){
            delete(buyingQueue[_type][_percentage].queue[_index]);
        }

        //refund money
        (msg.sender).transfer(ticketTypeMeta[_type].price);
    }

    function withdrawSellOrderFungible(uint256 _type, uint256 _quantity, uint8 _percentage, uint256 _index)
        public
        onlyQueuedUserOwnerSellingQueue(_type, _percentage, _index)
        onlyQueuedUserQuantitySellingQueue(_type, _percentage, _index, _quantity)
    {
        sellingQueue[_type][_percentage].queue[_index].quantity -= _quantity;
        sellingQueue[_type][_percentage].numberTickets -= _quantity;

        if(sellingQueue[_type][_percentage].queue[_index].quantity==0){
            delete(buyingQueue[_type][_percentage].queue[_index]);
        }
    }

    function withdrawSellOrderNonFungible()
        public
    {

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
    function popQueueUser(Queue storage _queue) private returns(address payable _address){
        uint256 i = _queue.head;
        while(i < _queue.tail){
            if(_queue.queue[i].userAddress != address(0)){
                
                // remove a ticket from the seller
                _address = _queue.queue[i].userAddress;
                _queue.queue[i].quantity--;

                // remove a ticket from the queue counter
                _queue.numberTickets -= 1;
                
                // remove from seller from queue if he has no more tickets to sell
                if(_queue.queue[i].quantity == 0){
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
    function getNumberOfTicketsForSale(uint256 _type, uint8 _percentage)
        public
        view
        onlyType(_type)
        returns(uint256)
    {
        return sellingQueue[_type][_percentage].numberTickets;
    }

    /**
    * @dev Returns a QueuedUser in the buying queue.
    *
    */
    function getQueuedUserBuying(uint256 _type, uint8 _percentage, uint256 _index) public view returns (QueuedUser memory){
        return buyingQueue[_type][_percentage].queue[_index];
    }

    /**
    * @dev Returns a QueuedUser in the selling queue.
    *
    */
    function getQueuedUserSelling(uint256 _type, uint8 _percentage, uint256 _index) public view returns (QueuedUser memory){
        return sellingQueue[_type][_percentage].queue[_index];
    }


    /**
    * @dev Returns the number of tickets that are present in the buying queue for a given type.
    *
    */
    function getNumberOfTicketOffers(uint256 _type, uint8 _percentage)
        public
        view
        onlyType(_type)
        returns(uint256)
    {
        return buyingQueue[_type][_percentage].numberTickets;
    }

    modifier onlyWhenQueueEmpty(uint256 ticketInQueue){
        require(ticketInQueue == 0, "One cannot sell a ticket if people are in the buying queue.");
        _;
    }

    modifier onlyForSale(uint256 _id){
        require(nfTickets[_id].userAddress != address(0), "This ticket is not for sale.");
        _;
    }

    modifier onlyQueuedUserOwnerBuyingQueue(uint256 _type, uint8 _percentage, uint256 _index){
        require(buyingQueue[_type][_percentage].queue[_index].userAddress == msg.sender, "The queued user (buying queue) is not the same user that requests to withdraw.");
        _;
    }

    modifier onlyQueuedUserOwnerSellingQueue(uint256 _type, uint8 _percentage, uint256 _index){
        require(sellingQueue[_type][_percentage].queue[_index].userAddress == msg.sender, "The queued user (selling queue) is not the same user that requests to withdraw.");
        _;
    }

    modifier onlyQueuedUserQuantityBuyingQueue(uint256 _type, uint8 _percentage, uint256 _index, uint256 _quantity){
        require(buyingQueue[_type][_percentage].queue[_index].quantity >= _quantity, "The queued user (buying queue) does not have this quantity of tickets in this position.");
        _;
    }

    modifier onlyQueuedUserQuantitySellingQueue(uint256 _type, uint8 _percentage, uint256 _index, uint256 _quantity){
        require(sellingQueue[_type][_percentage].queue[_index].quantity >= _quantity, "The queued user (selling queue) does not have this quantity of tickets in this position.");
        _;
    }

    modifier onlyCorrectPercentage(uint256 _id, uint8 _percentage){
        require(nfTickets[_id].percentage == _percentage, "This ticket is posted for sale with a different percentage.");
        _;
    }
}
