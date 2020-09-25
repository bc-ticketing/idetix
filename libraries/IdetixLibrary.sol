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

    // ERROR MESSAGES
    string constant buyingQueueNotEmpty = "One cannot sell a ticket if people are in the buying queue.";
    string constant badGranularity = "The granularity must be on of [100,50,25,20,10,5,4,2,1]";

    string constant badId1 = "The given NF index does not exist.";
    string constant badId2 = "";
    string constant badId3 = "";
    string constant badId4 = "This ticket is not for sale.";

    string constant badOwner = "";
    string constant badOwner2 = "The queued user (buying queue) is not the same user that requests to withdraw.";
    string constant badOwner3 = "The queued user (selling queue) is not the same user that requests to withdraw.";

    string constant badQuantity1 = "The requested amount of tickets exceeds the number of available tickets.";
    string constant badQuantity2 = "The requested amount of tickets exceeds the number of allowed tickets per person.";
    string constant badQuantity3 = "";
    string constant badQuantity4 = "The queued user (buying queue) does not have this quantity of tickets in this position.";
    string constant badQuantity5 = "The queued user (selling queue) does not have this quantity of tickets in this position.";

    string constant badValue1 = "The requested amount of tickets multiplied with the ticket price does not match with the sent value.";
    string constant badValue2 = "One of the tickets has already been minted.";

    string constant badPercentage = "This ticket is posted for sale with a different percentage.";

    string constant notVerified = "The sender has not been verified with the requested auth level.";
    string constant notNf = "The ticket type must be non fungible.";

    string constant emptySellingQueue = "The selling queue is empty";
    string constant emptyBuyingQueue = "The selling queue is empty";

    string constant closedAftermarket = "The aftermarket for this ticket type is closed.";

}
