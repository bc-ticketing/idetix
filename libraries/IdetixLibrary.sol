// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

library IdetixLibrary {
    // Use a split bit implementation.
    // Store the type in the upper 128 bits..
    uint256 constant TYPE_MASK = uint256(uint128(~0)) << 128;

    // ..and the non-fungible index in the lower 128
    uint256 constant NF_INDEX_MASK = uint128(~0);

    // The top bit is a flag to tell if this is a NFI.
    uint256 constant TYPE_NF_BIT = 1 << 255;

    function isNonFungible(uint256 _id) public pure returns(bool) {
        return _id & TYPE_NF_BIT == TYPE_NF_BIT;
    }
    function isFungible(uint256 _id) public pure returns(bool) {
        return _id & TYPE_NF_BIT == 0;
    }
    function getNonFungibleIndex(uint256 _id) public pure returns(uint256) {
        return _id & NF_INDEX_MASK;
    }
    function getBaseType(uint256 _id) public pure returns(uint256) {
        return _id & TYPE_MASK;
    }
    function isType(uint256 _id) public pure returns(bool){
        return (_id & NF_INDEX_MASK == 0);
    }

    //    function isNonFungibleBaseType(uint256 _id) public pure returns(bool) {
//        // A base type has the NF bit but does not have an index.
//        return (_id & TYPE_NF_BIT == TYPE_NF_BIT) && (_id & NF_INDEX_MASK == 0);
//    }
//    function isNonFungibleItem(uint256 _id) public pure returns(bool) {
//        // A base type has the NF bit but does has an index.
//        return (_id & TYPE_NF_BIT == TYPE_NF_BIT) && (_id & NF_INDEX_MASK != 0);
//    }

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

    /**
    * @param finalizationTime is time in seconds(!) since the last unix epoch
    */
    struct TicketType {
        uint256 price;
        uint256 finalizationTime;
        uint256 supply;
        uint256 ticketsSold;
    }

    struct NfSellOrder{
        address payable userAddress;
        uint8 percentage;
    }

    struct Lottery {
        uint256 supply;
        uint256 block;
    }

    // ERROR MESSAGES
    string constant buyingQueueNotEmpty = "BQNotEmpty"; //Cannot sell ticket if people are in the buying queue
    string constant badGranularity = "G"; //Granularity must be [100,50,25,20,10,5,4,2,1]

    string constant badId1 = "Id1"; //Given NF index does not exist
    string constant badId2 = "Id2"; //One of the tickets was already minted
    string constant badId3 = "Id3"; //Ticket is not for sale

    string constant badOwner1 = "O1"; //Sender does not own this ticket
    string constant badOwner2 = "O2"; //Queued user (buying queue) is not the same user that requests to withdraw
    string constant badOwner3 = "O3"; //Queued user (selling queue) is not the same user that requests to withdraw

    string constant badQuantity1 = "Q1"; //Requested amount exceeds the number of available tickets
    string constant badQuantity2 = "Q2"; //Requested amount of tickets exceeds the number of allowed tickets per person
    string constant badQuantity3 = "Q3"; //Quantity exceeds the number of owned tickets
    string constant badQuantity4 = "Q4"; //Queued user (buying queue) does not have quantity of tickets in this position
    string constant badQuantity5 = "Q5"; //Queued user (selling queue) does not have quantity of tickets in this position

    string constant badValue1 = "V1"; //Value does not match price
    string constant badValue2 = "V2"; //One of the tickets was minted already

    string constant badType1 = "T1"; //Given type has not been created yet
    string constant badType2 = "T2"; //Ticket type is requested - not id

    string constant badPercentage = "P"; //Ticket is posted for sale with a different percentage

    string constant notVerified = "notVerified"; //Sender has not been verified with the requested auth level
    string constant notRegistered = "notRegistered"; //Identity approver has not registered yet

    string constant notNf = "notNf"; //Ticket type must be non-fungible
    string constant notF = "notF"; //Ticket type must be fungible

    string constant emptySellingQueue = "emptySQ"; //Selling queue is empty
    string constant emptyBuyingQueue = "emptyBQ"; //Buying queue is empty

    string constant closedAftermarket = "closedAM"; //Aftermarket for this ticket type is closed

    string constant badBlock1 = "B1"; // The block must be a future block or the lottery is already over
    string constant badBlock2 = "B2"; // The lottery is already over
    string constant badBlock3 = "B3"; // The block must be a future block

    string constant badAddress1 = "A1"; // This address already has joined the presale
    string constant badAddress2 = "A2"; // The address did not participate in the presale

}
