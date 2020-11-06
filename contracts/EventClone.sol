// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Identity.sol";
import { IdetixLibrary } from "../libraries/IdetixLibrary.sol";

contract EventClone{
    using SafeMath for uint256;
    using SafeMath for uint8;

    function init(
        address payable _owner,
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        address _identityContract,
        address _identityApprover,
        uint8 _identityLevel,
        address _erc20Contract,
        uint8 _granularity
    )
        public
        onlyAllowedGranularity(_granularity)
    {

        owner = _owner;
        identityContract = Identity(_identityContract);
        identityApprover = _identityApprover;
        identityLevel = _identityLevel;
        erc20Contract = _erc20Contract;
        emit EventMetadata(_hashFunction, _size, _digest);

        for(uint8 i = 1; i<=_granularity; i++){
            allowedPercentages[(100/_granularity)*i] = true;
        }
        granularity = _granularity;
    }


    // Event.sol
    event EventMetadata(bytes1 hashFunction, bytes1 size, bytes32 digest);
    event TicketMetadata(uint256 indexed ticketTypeId, bytes1 hashFunction, bytes1 size, bytes32 digest);
    event ValueTransferred(address indexed sender, address indexed receiver, uint256 amount, address erc20contract);

    mapping (uint256 => address) public nfOwners;

    function ownerOf(uint256 _id)
        public
        view
        returns (address)
    {
        return nfOwners[_id];
    }

    function isExistingType(uint256 _id)
        public
        view
        returns(bool)
    {
        if (IdetixLibrary.isNonFungible(_id)) {
            return (getNonce(_id) <= nfNonce);
        } else {
            return (getNonce(_id) <= fNonce);
        }
    }

    function getNonce(uint256 _id)
        private
        pure
        returns(uint256)
    {
        return (~IdetixLibrary.TYPE_NF_BIT & _id) >> 128;
    }

    address payable owner;
    uint256 public nfNonce;
    uint256 public fNonce;
    mapping(uint256 => IdetixLibrary.TicketType) public ticketTypeMeta;
    mapping(address => uint256) public totalTickets;
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
        uint256[] memory _initialSupplies
    )
        public
        onlyEventOwner()
        returns(uint256[] memory)
    {
        uint256[] memory _ticketTypes = new uint256[](_prices.length);
        for(uint256 i = 0; i<_prices.length; i++) {
            _ticketTypes[i] = createType(_hashFunctions[i], _sizes[i], _digests[i], _isNFs[i], _prices[i], _finalizationTimes[i], _initialSupplies[i]);
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
    internal
        onlyEventOwner()
        returns(uint256 _ticketType)
    {
        // Set a flag if this is an NFI.
        if (_isNF) {
            _ticketType = (++nfNonce << 128);
            _ticketType = _ticketType | IdetixLibrary.TYPE_NF_BIT;
        } else {
            _ticketType = (++fNonce << 128);
        }

        ticketTypeMeta[_ticketType] = IdetixLibrary.TicketType(_price, _finalizationTime, _initialSupply, 0);
        emit TicketMetadata(_ticketType, _hashFunction, _size, _digest);
        return _ticketType;
    }

    function setMaxTicketsPerPerson(uint256 _quantity)
        public
    {
        maxTicketsPerPerson = _quantity;
    }

    function increaseSupply(uint256 _type, uint256 _addedSupply)
        public
        onlyEventOwner()
    {
        ticketTypeMeta[_type].supply = ticketTypeMeta[_type].supply.add(_addedSupply);
    }

    function updateType(
        uint256 _type,
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest
    )
        public
        onlyEventOwner()
    {
        emit TicketMetadata(_type, _hashFunction, _size, _digest);
    }

    function transferValue(address _sender, address _receiver, uint256 _amount)
        public
    {
        if(erc20Contract != address(0)) {
            if (_sender == address(this)) {
                ERC20(erc20Contract).transfer(_receiver, _amount);
            } else {
                ERC20(erc20Contract).transferFrom(_sender, _receiver, _amount);
            }
        } else if (_receiver != address(this)) {
            payable(_receiver).transfer(_amount);
        }
        emit ValueTransferred(_sender, _receiver, _amount, erc20Contract);
    }

    function getOwner()
        public
        view
        returns (address)
    {
        return owner;
    }

    function calcPrice(uint256 _type, uint256 _quantity, uint8 _percentage)
        internal
        view
        returns(uint256)
    {
        uint256 full = _quantity.mul(ticketTypeMeta[_type].price);
        uint256 fullPercentage = full.mul(_percentage);
        return fullPercentage.div(100);
    }

    function updateFinalizationTime(uint256 _ticketType, uint256 _finalizationTime)
        public
        onlyEventOwner()
    {
        ticketTypeMeta[_ticketType].finalizationTime = _finalizationTime;
    }

    modifier onlyEventOwner() {
        require(msg.sender == owner);
        _;
    }

    // The requested amount of tickets exceeds the number of available tickets.
    modifier onlyLessThanTotalSupply(uint256 _type, uint256 _quantity) {
        require(ticketTypeMeta[_type].ticketsSold + _quantity <= ticketTypeMeta[_type].supply, IdetixLibrary.badQuantity1);
        _;
    }

    // The requested amount of tickets exceeds the number of allowed tickets per person.
    modifier onlyLessThanMaxTickets(address buyer, uint256 _quantity) {
        require(totalTickets[buyer] + _quantity <= maxTicketsPerPerson, IdetixLibrary.badQuantity2);
        _;
    }

    // The requested amount of tickets multiplied with the ticket price does not match with the sent value.
    modifier onlyCorrectValue(uint256 _type, uint256 _quantity, uint256 _value, uint8 percentage) {
        if(erc20Contract == address(0)) {
            require(_quantity.mul(ticketTypeMeta[_type].price).mul(percentage).div(100) == _value, IdetixLibrary.badValue1);
        }
        _;
    }

    // The sender has not been verified with the requested auth level.
    modifier onlyVerified(address _buyer) {
        require(identityContract.getSecurityLevel(identityApprover, _buyer) >= identityLevel, IdetixLibrary.notVerified);
        _;
    }

    // The given NF index does not exist.
    modifier onlyValidNfId(uint256 _id) {
        require(IdetixLibrary.getNonFungibleIndex(_id) <= ticketTypeMeta[IdetixLibrary.getBaseType(_id)].supply, IdetixLibrary.badId1);
        _;
    }

    // One of the tickets has already been minted.
    modifier onlyNonMintedNf(uint256 _id) {
        require(nfOwners[_id] == address(0), IdetixLibrary.badId2);
        _;
    }

    // The ticket type must be non fungible.
    modifier onlyNonFungible(uint256 _id) {
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



    // Mintable.sol
    event MintFungibles(address indexed owner, uint256 ticketType, uint256 quantity);
    event MintNonFungibles(address indexed owner, uint256[] ids);
    event AffiliatesReward(uint256 amount);

    function mintFungible(uint256 _type, uint256 _quantity, address[] memory _affiliates)
        public
        payable
        onlyFungible(_type)
        onlyCorrectValue(_type, _quantity, msg.value, 100)
        onlyLessThanMaxTickets(msg.sender, _quantity)
        onlyVerified(msg.sender)
    {
        // Grant the ticket to the caller
        _mintFungible(_type, _quantity);

        uint256 totalPrice = ticketTypeMeta[_type].price * _quantity;
        uint256 affiliatesReward = totalPrice.mul(affiliatesPercentage).div(100);
        uint256 cutPerAffiliate = affiliatesReward.div(_affiliates.length + 1); //plus 1 for identity approver

        //pay owner
        transferValue(msg.sender, owner, totalPrice.sub(affiliatesReward));

        //pay affiliates
        for(uint256 i = 0; i<_affiliates.length; i++){
            transferValue(msg.sender, _affiliates[i], cutPerAffiliate);
        }

        //pay identity approver
        transferValue(msg.sender, identityApprover, cutPerAffiliate);

        emit MintFungibles(msg.sender, _type, _quantity);
    }

    function _mintFungible(uint256 _type, uint256 _quantity)
    internal
    {
        tickets[_type][msg.sender] = _quantity.add(tickets[_type][msg.sender]);
        totalTickets[msg.sender] = totalTickets[msg.sender].add(_quantity);
    }


    function mintNonFungibles(uint256[] memory _ids, address[] memory _affiliates)
        public
        payable
        onlyLessThanMaxTickets(msg.sender, _ids.length)
        onlyVerified(msg.sender)
    {
        uint256 totalPrice = 0;

        for(uint256 i = 0; i<_ids.length; i++) {
            totalPrice += _mintNonFungible(_ids[i]);
        }

        // The sent value does not match the total price.
        totalTickets[msg.sender] = totalTickets[msg.sender].add(_ids.length);

        if(erc20Contract == address(0)) {
            require(totalPrice == msg.value, IdetixLibrary.badValue1);
        }

        uint256 affiliatesReward = totalPrice.mul(affiliatesPercentage).div(100);
        uint256 cutPerAffiliate = affiliatesReward.div(_affiliates.length + 1); //plus 1 for identity approver

        //pay owner
        transferValue(msg.sender, owner, totalPrice.sub(affiliatesReward));

        //pay affiliates
        for(uint256 i = 0; i<_affiliates.length; i++){
            transferValue(msg.sender, _affiliates[i], cutPerAffiliate);
        }

        //pay identity approver
        transferValue(msg.sender, identityApprover, cutPerAffiliate);


        emit MintNonFungibles(msg.sender, _ids);
    }

    function _mintNonFungible(uint256 _id)
        internal
        onlyValidNfId(_id)
        onlyNonMintedNf(_id)
        returns(uint256 _price)
    {
        // store how many nf tickets are owned by one account (maybe not needed)
        tickets[IdetixLibrary.getBaseType(_id)][msg.sender]++;
        nfOwners[_id] = msg.sender;
        return ticketTypeMeta[IdetixLibrary.getBaseType(_id)].price;
    }


    //Aftermarket.sol
    event TicketTransferred(address indexed seller, address indexed buyer, uint256 id);

    event BuyOrderPlaced(address indexed addr, uint256 ticketType, uint256 quantity, uint8 percentage);

    event SellOrderFungiblePlaced(address indexed addr, uint256 ticketType, uint256 quantity, uint8 percentage);
    event SellOrderFungibleFilled(address indexed addr, uint256 ticketType, uint256 quantity, uint8 percentage);
    event BuyOrderFungibleFilled(address indexed addr, uint256 ticketType, uint256 quantity, uint8 percentage);
    event SellOrderFungibleWithdrawn(address indexed addr, uint256 ticketType, uint256 quantity, uint8 percentage);

    event SellOrderNonFungiblePlaced(address indexed addr, uint256[] _ids, uint8[] percentage);
    event SellOrderNonFungibleFilled(address indexed addr, uint256[] _ids, uint8[] percentage);
    event BuyOrderNonFungibleFilled(address indexed addr, uint256[] _ids, uint8[] percentage);
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

            //transfer value (the contract currently holds the value!)
            //            transferValue(address(this), msg.sender, (ticketTypeMeta[_type].price).mul(_percentage).div(100));

            totalInBuying[_type]--;
            _quantity--;
        }
        emit BuyOrderFungibleFilled(msg.sender, _type, _quantity, _percentage);
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
        emit SellOrderFungibleFilled(msg.sender, _type, _quantity, _percentage);
        address payable seller;
        //        uint256 amount = getValue(_percentage, _type);
        while(_quantity > 0){
            seller = popQueueUser(sellingQueue[_type][_percentage]);

            require(seller != address(0), IdetixLibrary.emptySellingQueue);
            totalInSelling[_type] -= _quantity;

            transfer(msg.sender, seller, _type, _percentage, false);
            //            transferValue(msg.sender, seller, amount);

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
        emit BuyOrderNonFungibleFilled(msg.sender, _ids, _percentages);
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
        emit SellOrderNonFungibleFilled(msg.sender, _ids, _percentages);
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

        if(buyingQueue[_type][_percentage].queue[_index].quantity==0){
            delete(buyingQueue[_type][_percentage].queue[_index]);
        }

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

        if(sellingQueue[_type][_percentage].queue[_index].quantity==0){
            delete(buyingQueue[_type][_percentage].queue[_index]);
        }
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
            if(_queue.queue[i].userAddress != address(0)){

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

    //The granularity must be a factor of 100.
    modifier onlyAllowedGranularity(uint8 _granularity) {
        bool out = false;
        for(uint8 i=0; i<9; i++){
            if(allowedGranularities[i]==_granularity) {
                out=true;
                break;
            }
        }
        require(out, IdetixLibrary.badGranularity);
        _;
    }

    //Presale.sol
    event PresaleCreated(uint256 ticketType, uint256 supply, uint256 block);
    event PresaleJoined(uint256 indexed ticketType, address indexed user, uint256 luckyNumber);
    event TicketClaimed(address indexed user, uint256 ticketType);
    event TicketPriceRefunded(uint256 indexed ticketType, address indexed user);

    /**
    * @dev Must start at 1, allowing to check if address has participated in presale.
    */
    //type => nonce
    mapping(uint256 => uint256) public nonces;
    //type => address => lucky number
    mapping(uint256 => mapping(address => uint256)) public entries;
    mapping(uint256 => IdetixLibrary.Lottery) public lotteries;
    //type => nf ticket id
    mapping(uint256 => uint256) public nfMintCounter;

    /**
    * @dev Creating a number of ticket types with a presale.
    * @param _finalizationTimes are unix timestamps in seconds(!)
    */
    function createPresaleTypes(
        bytes1[] memory _hashFunctions,
        bytes1[] memory _sizes,
        bytes32[] memory _digests,
        bool[] memory _isNFs,
        uint256[] memory _prices,
        uint256[] memory _finalizationTimes,
        uint256[] memory _supplies,
        uint256[] memory _blocks
    )
        public
        onlyEventOwner()
    {
        for (uint256 i = 0; i < _prices.length; i++) {
            createPresaleType(_hashFunctions[i], _sizes[i], _digests[i], _isNFs[i], _prices[i], _finalizationTimes[i], _supplies[i], _blocks[i]);
        }
    }

    /**
    * @param _finalizationTime is the number of seconds(!) since the last unix time epoch
    */
    function createPresaleType(
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        bool _isNF,
        uint256 _price,
        uint256 _finalizationTime,
        uint256 _supply,
        uint256 _block
    )
        internal
        onlyFutureBlock(_block)
    {
        uint256 ticketType = createType(_hashFunction, _size, _digest, _isNF, _price, _finalizationTime, _supply);
        lotteries[ticketType] = IdetixLibrary.Lottery(_supply, _block);
        emit PresaleCreated(ticketType, _supply, _block);
    }

    function joinPresale(uint256 _type)
        external
        payable
        onlyType(_type)
        onlyVerified(msg.sender)
        onlyBeforeLotteryEnd(lotteries[_type].block)
        onlyCorrectValue(_type, 1, msg.value, 100)
    {
        nonces[_type]++;
        entries[_type][msg.sender] = nonces[_type];
        emit PresaleJoined(_type, msg.sender, nonces[_type]);
    }

    /**
    * @dev Either claims the ticket or the ticket price is refunded.
    *
    */
    function claim(uint256 _type)
        public
        onlyBeforeBlock(lotteries[_type].block)
        onlyParticipants(_type, msg.sender)
        onlyType(_type)
    {
        if (hasWon(_type)) {
            if (IdetixLibrary.isFungible(_type)) {
                _mintFungible(_type, 1);
            } else {
                nfMintCounter[_type] = nfMintCounter[_type].add(1);
                _mintNonFungible(_type.add(nfMintCounter[_type]));
            }
            emit TicketClaimed(msg.sender, _type);
        } else {
            transferValue(address(this), msg.sender, ticketTypeMeta[_type].price);
            emit TicketPriceRefunded(_type, msg.sender);
        }
        entries[_type][msg.sender] = 0; // disable multiple refunds
    }

    function hasWon(uint256 _type)
        public
        view
        returns(bool)
    {
        uint256 personalNumber = entries[_type][msg.sender];
        uint256 numberParticipants = nonces[_type];
        uint256 lotteryNumber = getRandomNumber(1, numberParticipants, lotteries[_type].block);

        // upperbound: nonce that still wins a ticket
        uint256 upperBound = lotteryNumber.add(lotteries[_type].supply - 1);

        // double overflow: number of participant less than total available tickets -> all registrants win a ticket
        if (numberParticipants <= lotteries[_type].supply) {
            return true;
        }

        // no overflow: the selected range of indexes does not exceed the number of participants
        else if (upperBound <= numberParticipants) {
            return personalNumber >= lotteryNumber && personalNumber <= upperBound ? true:false;
        }

        // overflow: the selected range exceeds the number of participants and needs
        else {
            uint256 overflowUpperBound = upperBound.sub(numberParticipants);
            return (personalNumber >= lotteryNumber && personalNumber <= numberParticipants) || (personalNumber >= 1 && personalNumber <= overflowUpperBound) ? true:false;
        }
    }

    /**
    * @notice This function can be used to generate a random number based on the specific future blockhash
    * @dev The miner of the defined block number has the possibility to withhold a mined block in order to manipulate the randomness.
    * @param min The lower boundary of the random range (min is part of the range)
    * @param max The upper boundary of the random range (max is part of the range)
    * @param blockNumber The block number which is used to create the random numbers
    * @return A random integer greater or equal to min and smaller or equal to max
    */
    function getRandomNumber(uint256 min, uint256 max, uint256 blockNumber)
    private
    view
    onlyBeforeBlock(blockNumber)
    returns(uint256)
    {
        return (uint256(blockhash(blockNumber)) % (max - min + 1)) + min;
    }

    // The block must be a future block or the lottery is already over
    modifier onlyBeforeBlock(uint256 _block) {
        require(block.number > _block, IdetixLibrary.badBlock1);
        _;
    }

    // The lottery is already over
    modifier onlyBeforeLotteryEnd(uint256 _block) {
        require(block.number <= _block, IdetixLibrary.badBlock2);
        _;
    }

    // The block must be a future block
    modifier onlyFutureBlock(uint256 _block) {
        require(block.number < _block, IdetixLibrary.badBlock3);
        _;
    }

    // This address already has joined the presale
    modifier onlyNonParticipants(uint256 _type, address _address) {
        require(entries[_type][_address] == 0, IdetixLibrary.badAddress1);
        _;
    }

    modifier onlyParticipants(uint256 _type, address _address) {
        require(entries[_type][_address] != 0, IdetixLibrary.badAddress2);
        _;
    }
}
