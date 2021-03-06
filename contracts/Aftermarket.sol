// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
import './Event.sol';
pragma experimental ABIEncoderV2;

abstract contract Aftermarket is Event{
    
    event TicketTransferred(address indexed seller, address indexed buyer, uint256 id);

    event BuyOrderPlaced(address indexed addr, uint256 ticketType, uint256 quantity, uint8 percentage);

    event SellOrderFungiblePlaced(address indexed addr, uint256 ticketType, uint256 quantity, uint8 percentage);
    event SellOrderFungibleFilled(address addr, address seller, uint256 ticketType, uint8 percentage);
    event BuyOrderFungibleFilled(address addr, address buyer, uint256 ticketType, uint8 percentage);
    event SellOrderFungibleWithdrawn(address indexed addr, uint256 ticketType, uint256 quantity, uint8 percentage);

    event SellOrderNonFungiblePlaced(address indexed addr, uint256[] _ids, uint8[] percentage);
    event SellOrderNonFungibleFilled(address addr, address seller, uint256 _id, uint8 percentage);
    event BuyOrderNonFungibleFilled(address addr, address buyer, uint256 _id, uint8 percentage);
    event SellOrderNonFungibleWithdrawn(address indexed addr, uint256 _id);

    event SellOrderWithdrawn(address indexed addr, uint256 ticketType, uint256 quantity, uint8 percentage);
    event BuyOrderWithdrawn(address indexed addr, uint256 ticketType, uint256 quantity, uint8 percentage);

    //type => percentage => queue
    mapping(uint256 => mapping(uint8 => IdetixLibrary.Queue)) public buyingQueue;
    mapping(uint256 => mapping(uint8 => IdetixLibrary.Queue)) public sellingQueue;

    /**
    * @dev Non-fungible tickets that are posted for sale
    * id => {userAddress, percentage}
    */
    mapping(uint256 => IdetixLibrary.NfSellOrder) public nfTickets;
    mapping(uint256 => uint256) public totalInBuying;
    mapping(uint256 => uint256) public totalInSelling;

    uint256[] nfsForSale;

    /**
    * @dev The granularity defines at which percentages a ticket can be resold
    * e.g. granularity = 4 => the ticket can be resold at 25%, 50%, 75%, 100% of the original ticket price
    */
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
        onlyCorrectValue(_type, _quantity, msg.value, _percentage)
        onlyLessThanMaxTickets(msg.sender, _quantity)
        onlyNonFinalizedAftermarket(_type)
    {
        buyingQueue[_type][_percentage].queue[buyingQueue[_type][_percentage].tail] = IdetixLibrary.QueuedUser(msg.sender, _quantity);
        buyingQueue[_type][_percentage].tail++;
        buyingQueue[_type][_percentage].numberTickets += _quantity;
        totalInBuying[_type] += _quantity;
        uint256 totalPrice = _quantity.mul(ticketTypeMeta[_type].price);
        transferValue(msg.sender, address(this), totalPrice.mul(_percentage).div(100));
        emit BuyOrderPlaced(msg.sender, _type, _quantity, _percentage);
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
        onlyNonFinalizedAftermarket(_type)
    {
        sellingQueue[_type][_percentage].queue[sellingQueue[_type][_percentage].tail] = IdetixLibrary.QueuedUser(msg.sender, _quantity);
        sellingQueue[_type][_percentage].tail++;
        sellingQueue[_type][_percentage].numberTickets += _quantity;
        totalInSelling[_type] += _quantity;
        emit SellOrderFungiblePlaced(msg.sender, _type, _quantity, _percentage);
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
        onlyNonFinalizedAftermarket(_type)
    {
        while(_quantity > 0){
            address payable buyer = popQueueUser(buyingQueue[_type][_percentage]);
            require(buyer != address(0), IdetixLibrary.emptyBuyingQueue);

            //transfer ownership
            transfer(buyer, msg.sender, _type, _percentage, true);
            emit BuyOrderFungibleFilled(msg.sender, buyer, _type, _percentage);

            //transfer value (the contract currently holds the value!)
//            transferValue(address(this), msg.sender, (ticketTypeMeta[_type].price).mul(_percentage).div(100));

            totalInBuying[_type]--;
            _quantity--;
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
        onlyFungible(_type)
        onlyCorrectValue(_type, _quantity, msg.value, _percentage)
        onlyLessThanMaxTickets(msg.sender, _quantity)
        onlyVerified(msg.sender)
        onlyNonFinalizedAftermarket(_type)
    {
        address payable seller;
//        uint256 amount = getValue(_percentage, _type);
        while(_quantity > 0){
            seller = popQueueUser(sellingQueue[_type][_percentage]);
            
            require(seller != address(0), IdetixLibrary.emptySellingQueue);
            totalInSelling[_type] -= _quantity;

            transfer(msg.sender, seller, _type, _percentage, false);
            emit SellOrderFungibleFilled(msg.sender, seller, _type, _percentage);

            _quantity--;
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
    function fillBuyOrderNonFungibles(uint256[] memory _ids, uint8[] memory _percentages)
        public
    {
        for(uint256 i = 0; i < _ids.length; i++){
            fillBuyOrderNonFungible(_ids[i], _percentages[i]);
        }
    }

    function fillBuyOrderNonFungible(uint256 _id, uint8 _percentage)
        private
        onlyNonFungible(_id)
        onlyNonFinalizedAftermarket(IdetixLibrary.getBaseType(_id))
    {
        //get head of buyingQueue
        uint256 _type = IdetixLibrary.getBaseType(_id);
        address payable buyer = popQueueUser(buyingQueue[_type][_percentage]);
        require(buyer != address(0), IdetixLibrary.emptyBuyingQueue);
        totalInBuying[_type]--;

        // transfer ownership
        transfer(buyer, msg.sender, _id, _percentage, true);
        emit BuyOrderNonFungibleFilled(msg.sender, buyer, _id, _percentage);

        // transfer value (contract currently holds the value)
//        transferValue(address(this), msg.sender, (ticketTypeMeta[_type].price).mul(_percentage).div(100));

        // TODO: check if next buyer same address -> if true only make one tx
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
        emit SellOrderNonFungiblePlaced(msg.sender, _ids, _percentages);
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
        onlyWhenQueueEmpty(buyingQueue[IdetixLibrary.getBaseType(_id)][_percentage].numberTickets)
        onlyNfOwner(msg.sender, _id)
        onlyNonFungible(_id)
        onlyNonFinalizedAftermarket(IdetixLibrary.getBaseType(_id))

    {
        nfTickets[_id] = IdetixLibrary.NfSellOrder(msg.sender, _percentage);
        totalInSelling[IdetixLibrary.getBaseType(_id)]++;
        nfsForSale.push(_id);
    }

    /**
     * @dev Fills the NF sellings as a batch transfer.
     * Executes the ownership and value transfer.
     * We don't check the price since the tx simply fails if the value cannot be transferred from the buyer to seller.
     * (This is different when depositing ETH in the contract)
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
        onlyNonFinalizedAftermarket(IdetixLibrary.getBaseType(_id))
    {
        uint256 _type = IdetixLibrary.getBaseType(_id);
        totalInSelling[_type]--;
        transfer(msg.sender, nfTickets[_id].userAddress, _id, _percentage, false);
        emit SellOrderNonFungibleFilled(msg.sender, nfTickets[_id].userAddress, _id, _percentage);
        //        transferValue(msg.sender, nfTickets[_id].userAddress, (ticketTypeMeta[_type].price).mul(_percentage).div(100));
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

        //refund money
        transferValue(address(this), msg.sender, ticketTypeMeta[_type].price);

        BuyOrderWithdrawn(msg.sender, _type, _quantity, _percentage);
    }

    function withdrawSellOrderFungible(uint256 _type, uint256 _quantity, uint8 _percentage, uint256 _index)
        public
        onlyQueuedUserOwnerSellingQueue(_type, _percentage, _index)
        onlyQueuedUserQuantitySellingQueue(_type, _percentage, _index, _quantity)
    {
        sellingQueue[_type][_percentage].queue[_index].quantity -= _quantity;
        sellingQueue[_type][_percentage].numberTickets -= _quantity;

        emit SellOrderFungibleWithdrawn(msg.sender, _type, _quantity, _percentage);
    }

    function withdrawSellOrderNonFungible(uint256 _id)
        public
        onlyNfOwner(msg.sender, _id)
    {
        delete(nfTickets[_id]);
        totalInSelling[IdetixLibrary.getBaseType(_id)]--;

        emit SellOrderNonFungibleWithdrawn(msg.sender, _id);
    }


    function transfer(address _buyer, address payable _seller, uint256 _id, uint8 _percentage, bool _fromHost)
        private
        onlyLessThanMaxTickets(_buyer, 1)
    {
        //transfer ownership
        uint256 _type = IdetixLibrary.getBaseType(_id);
        tickets[_type][_buyer]++;
        tickets[_type][_seller]--;
        totalTickets[_buyer]++;
        totalTickets[_seller]--;
        if (IdetixLibrary.isNonFungible(_id)) nfOwners[_id] = _buyer;

        //transfer value
        if (_fromHost) transferValue(address(this), _seller, (ticketTypeMeta[_type].price).mul(_percentage).div(100));
        else transferValue(_buyer, _seller, (ticketTypeMeta[_type].price).mul(_percentage).div(100));

        emit TicketTransferred(_seller, _buyer, _id);
    }

    /**
    * @dev Finds the next user in the queue and removes it.
    * The head pointer is updated.
    * Users that left the queue are ignored.
    * Returns address(0) if no user is in the queue.
    *
    */
    function popQueueUser(IdetixLibrary.Queue storage _queue)
        private
        returns(address payable _address)
    {
        uint256 i = _queue.head;
        while(i < _queue.tail){
            if(_queue.queue[i].quantity > 0){
                // remove a ticket from the seller
                _address = _queue.queue[i].userAddress;
                _queue.queue[i].quantity--;

                // remove a ticket from the queue counter
                _queue.numberTickets--;
                
                // remove from seller from queue if he has no more tickets to sell
                if(_queue.queue[i].quantity == 0){
                    delete (_queue.queue[i]);
                    _queue.head++;
                }
                return _address;                
            }else{
                _queue.head++;
            }
            i++;
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
    function getQueuedUserBuying(uint256 _type, uint8 _percentage, uint256 _index)
        public
        view
        returns (IdetixLibrary.QueuedUser memory)
    {
        return buyingQueue[_type][_percentage].queue[_index];
    }

    /**
    * @dev Returns a QueuedUser in the selling queue.
    *
    */
    function getQueuedUserSelling(uint256 _type, uint8 _percentage, uint256 _index)
        public
        view
        returns (IdetixLibrary.QueuedUser memory)
    {
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

    // One cannot sell a ticket if people are in the buying queue.
    modifier onlyWhenQueueEmpty(uint256 ticketInQueue){
        require(ticketInQueue == 0, IdetixLibrary.buyingQueueNotEmpty);
        _;
    }

    // This ticket is not for sale.
    modifier onlyForSale(uint256 _id){
        require(nfTickets[_id].userAddress != address(0), IdetixLibrary.badId3);
        _;
    }

    // The queued user (buying queue) is not the same user that requests to withdraw.
    modifier onlyQueuedUserOwnerBuyingQueue(uint256 _type, uint8 _percentage, uint256 _index){
        require(buyingQueue[_type][_percentage].queue[_index].userAddress == msg.sender, IdetixLibrary.badOwner2);
        _;
    }

    // The queued user (selling queue) is not the same user that requests to withdraw.
    modifier onlyQueuedUserOwnerSellingQueue(uint256 _type, uint8 _percentage, uint256 _index){
        require(sellingQueue[_type][_percentage].queue[_index].userAddress == msg.sender, IdetixLibrary.badOwner3);
        _;
    }

    // The queued user (buying queue) does not have this quantity of tickets in this position.
    modifier onlyQueuedUserQuantityBuyingQueue(uint256 _type, uint8 _percentage, uint256 _index, uint256 _quantity){
        require(buyingQueue[_type][_percentage].queue[_index].quantity >= _quantity, IdetixLibrary.badQuantity4);
        _;
    }

    // The queued user (selling queue) does not have this quantity of tickets in this position.
    modifier onlyQueuedUserQuantitySellingQueue(uint256 _type, uint8 _percentage, uint256 _index, uint256 _quantity){
        require(sellingQueue[_type][_percentage].queue[_index].quantity >= _quantity, IdetixLibrary.badQuantity5);
        _;
    }

    // This ticket is posted for sale with a different percentage.
    modifier onlyCorrectPercentage(uint256 _id, uint8 _percentage){
        require(nfTickets[_id].percentage == _percentage, IdetixLibrary.badPercentage);
        _;
    }

    modifier onlyNonFinalizedAftermarket(uint256 _ticketTypeId){
        require(ticketTypeMeta[_ticketTypeId].finalizationTime > block.timestamp, IdetixLibrary.closedAftermarket);
        _;
    }
}
