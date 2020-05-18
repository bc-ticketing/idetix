// SPDX-License-Identifier: MIT

pragma solidity >=0.4.22 <0.7.0;


library EventLibrary {
    struct Multihash {
        bytes32 hashBytes;
        uint8 hashFunction;
        uint8 hashSize;
    }

    // ********** Fungible Tickets **********
    // Tickets which are indifferent to each other (eg. standing room area 1)
    //    struct FungibleTicket {
    //        uint256 id;
    //        address payable owner;
    //    }

    // struct FungibleTicketFactory {
    //     // ticket details
    //     string metadataURI; // JSON storing ticket details such VIP access
    //     bytes32 hashMetadata; // hash of JSON to verify the retrieved data
    //     uint256 numberTickets;
    //     uint256 ticketPrice;
    //     // keeping track of sold tickets
    //     // using hashes as ids
    //     uint256 ticketIndex;
    //     mapping(uint256 => FungibleTicket) tickets;
    //     // parameters for secondary market logic
    //     uint256 sellingQueueHead;
    //     uint256 sellingQueueTail;
    //     uint256 buyingQueueHead;
    //     uint256 buyingQueueTail;
    //     mapping(uint256 => FungibleTicket) sellingQueue;
    //     mapping(uint256 => address payable) buyingQueue;
    // }

    // ********** Non Fungible Tickets **********
    // Tickets which cannot be replaced by another ticket of the same event such as theater ticket (seat reservation).
    struct NonFungibleTicket {
        uint256 id;
        address payable owner;
        bool isForSale;
    }

    struct NonFungibleTicketFactory {
        uint256 numberTickets;
        uint256 ticketPrice;
        string metadataURI; // JSON storing ticket details such as seat number
        bytes32 hashMetadata; // hash of JSON to verify the retrieved data
        uint256 numberTicketsIssued;
        mapping(uint256 => NonFungibleTicket) tickets;
    }
}
