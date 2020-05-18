// SPDX-License-Identifier: MIT

pragma solidity >=0.4.22 <0.7.0;
pragma experimental ABIEncoderV2; //allows returning a struct from a function

import "./FungibleTicketFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


// Tickets may be priced in ETH or ERC20.

contract Event {
    event IpfsCid(bytes1 hashFunction, bytes1 size, bytes32 digest);
    event FungibleTicketAdded(address);

    address payable public owner;
    uint256 eventId;
    // EventLibrary.Multihash public metadataMultihash; // IPFS id, hash of JSON storing name, date, location, website
    address[] public fungibleTicketFactories;
    address[] public nonFungibleTicketFactories;

    //mapping (uint => EventLibrary.NonFungibleTicketFactory) nonFungibleTickets;

    // TODO allowed different verification methods
    // TODO affiliate addressess

    /**
     * @dev ERC20 token address which is accepted for payments address(0) for ETH
     */
    address private _erc20Address;

    constructor(
        address payable _owner,
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        address erc20Address
    ) public {
        owner = _owner;
        _erc20Address = erc20Address;
        emit IpfsCid(_hashFunction, _size, _digest);
    }

    function updateIpfsCid(bytes1 _hashFunction, bytes1 _size, bytes32 _digest)
        public
    {
        //TODO only owner
        emit IpfsCid(_hashFunction, _size, _digest);
    }

    function addFungibleTicketFactory(
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        uint256 _ticketPrice,
        uint256 _numberTickets
    ) public {
        // TODO only owner

            FungibleTicketFactory newFungibleTicketFactory
         = new FungibleTicketFactory(
            _hashFunction,
            _size,
            _digest,
            _numberTickets,
            _ticketPrice
        );

        emit FungibleTicketAdded(address(newFungibleTicketFactory));

        fungibleTicketFactories.push(address(newFungibleTicketFactory));
    }

    function getFunglibleTicketFactories()
        public
        view
        returns (address[] memory)
    {
        return fungibleTicketFactories;
    }

    function getOwner() public view returns (address payable) {
        return owner;
    }

    function erc20Address() public view returns (address) {
        return _erc20Address;
    }

    // TODO function to remove position in the buying queue and get money back

    //function addNonFungibleTicketFactory(uint _ticketPrice, uint _numberTickets, string memory _metadataURI) public{
    //    // TODO only owner of the event can add tickets
    //    nonFungibleTickets[nonFungibleTicketFactoryIndex] = EventLibrary.NonFungibleTicketFactory({
    //        metadataURI: _metadataURI,
    //        hashMetadata: keccak256(bytes(_metadataURI)),
    //        numberTickets: _numberTickets,
    //        ticketPrice: _ticketPrice,
    //        numberTicketsIssued: 0
    //    });
    //    nonFungibleTicketFactoryIndex++;
    //}
    //
    //function buyNonFungibleTicket(uint _nonFungibleTicketFactoryId, uint _ticketId) public payable{
    //    // TODO Check if msg.sender is has verified ID in verification smart contract
    //    EventLibrary.NonFungibleTicketFactory storage nftf = nonFungibleTickets[_nonFungibleTicketFactoryId];
    //    require(msg.value == nftf.ticketPrice, "The value does not match the ticket price.");
    //    require(nftf.tickets[_ticketId].owner == address(0) || nftf.tickets[_ticketId].isForSale, "This ticket has been bought already and is currently not for sale.");
    //
    //    // ticket has not been issued before, create a new ticket otherwise transfer the ownership
    //    if (nftf.tickets[_ticketId].owner == address(0)){
    //        issueNonFungibleTicket(nftf, _ticketId, msg.sender, msg.value, owner);
    //    }else{
    //        changeTicketOwner(nftf, _ticketId, msg.sender, msg.value);
    //    }
    //}
    //
    //function issueNonFungibleTicket(EventLibrary.NonFungibleTicketFactory storage _nftf, uint _ticketId, address payable _owner, uint _ticketPrice, address payable _eventOwner) internal {
    //    _nftf.tickets[_ticketId] = EventLibrary.NonFungibleTicket({
    //        id: _ticketId,
    //        owner: _owner,
    //        isForSale: false
    //    });
    //
    //    _nftf.numberTicketsIssued ++;
    //
    //    // TODO send ticket price to an escrow service
    //    (_eventOwner).transfer(_ticketPrice);
    //}
    //
    //function changeTicketOwner(EventLibrary.NonFungibleTicketFactory storage _nftf, uint _ticketId, address payable _newOwner, uint _ticketValue) internal {
    //
    //    // pay previous owner
    //    (_nftf.tickets[_ticketId].owner).transfer(_ticketValue);
    //
    //    // transfer ownership
    //    _nftf.tickets[_ticketId].owner = _newOwner;
    //}
    //
    //function sellNonFungibleTicket(uint _nonFungibleTicketFactoryId, uint _ticketId) public{
    //    EventLibrary.NonFungibleTicketFactory storage nftf = nonFungibleTickets[_nonFungibleTicketFactoryId];
    //    require(msg.sender == nftf.tickets[_ticketId].owner, "Only the owner of this ticket can sell this ticket.");
    //    nftf.tickets[_ticketId].isForSale = true;
    //}
    //
    //function cancelSellOrderNonFungibleTicket(uint _nonFungibleTicketFactoryId, uint _ticketId) public{
    //    EventLibrary.NonFungibleTicketFactory storage nftf = nonFungibleTickets[_nonFungibleTicketFactoryId];
    //    require(msg.sender == nftf.tickets[_ticketId].owner, "Only the owner of this ticket can stop the sell order of this ticket.");
    //    nftf.tickets[_ticketId].isForSale = false;
    //}

    // **** Getters ****
    //function getFungibleTicket(uint _fungibleTicketFactoryId, uint _ticketId) public view returns(EventLibrary.FungibleTicket memory _ticket){
    //    return fungibleTickets[_fungibleTicketFactoryId].tickets[_ticketId];
    //}
    //
    //function getFungibleTickets(uint _fungibleTicketFactoryId) public view returns(EventLibrary.FungibleTicket[] memory _fts){
    //    uint numTickets = fungibleTickets[_fungibleTicketFactoryId].ticketIndex;
    //    _fts = new EventLibrary.FungibleTicket[](numTickets);
    //    for(uint256 i = 0; i < numTickets; i++){
    //        _fts[i] = fungibleTickets[_fungibleTicketFactoryId].tickets[i];
    //    }
    //    return _fts;
    //}
    //
    //function getFungibleTicketFactory(uint _fungibleTicketFactoryId) public view returns(
    //        string memory _metadataURI,
    //        bytes32 _hashMetadata,
    //        uint _numberTickets,
    //        uint _ticketPrice,
    //        uint _ticketIndex,
    //        uint _sellingQueueHeadLength,
    //        uint _buyingQueueHeadLength
    //    ){
    //    EventLibrary.FungibleTicketFactory memory ftf = fungibleTickets[_fungibleTicketFactoryId];
    //    return (ftf.metadataURI, ftf.hashMetadata, ftf.numberTickets, ftf.ticketPrice, ftf.ticketIndex, ftf.sellingQueueHead - ftf.sellingQueueTail, ftf.buyingQueueHead - ftf.buyingQueueTail);
    //}
    //
    //function getNonFungibleTicket(uint _nonFungibleTicketFactoryId, uint _ticketId) public view returns(EventLibrary.NonFungibleTicket memory _ticket){
    //    return nonFungibleTickets[_nonFungibleTicketFactoryId].tickets[_ticketId];
    //}
    //
    //function getNonFungibleTickets(uint _nonFungibleTicketFactoryId) public view returns(EventLibrary.NonFungibleTicket[] memory _nfts){
    //    uint numTickets = nonFungibleTickets[_nonFungibleTicketFactoryId].numberTicketsIssued;
    //
    //    _nfts = new EventLibrary.NonFungibleTicket[](numTickets);
    //
    //    for(uint256 i = 0; i < numTickets; i++){
    //        _nfts[i] = nonFungibleTickets[_nonFungibleTicketFactoryId].tickets[i];
    //    }
    //    return _nfts;
    //}
    //
    //    function getNonFungibleTicketFactory(uint _nonFungibleTicketFactoryId) public view returns(
    //        string memory _metadataURI,
    //        bytes32 _hashMetadata,
    //        uint _numberTickets,
    //        uint _ticketPrice,
    //        uint _numberTicketsIssued
    //    ){
    //    EventLibrary.NonFungibleTicketFactory memory nftf = nonFungibleTickets[_nonFungibleTicketFactoryId];
    //    return (nftf.metadataURI, nftf.hashMetadata, nftf.numberTickets, nftf.ticketPrice, nftf.numberTicketsIssued);
    //}
} //
