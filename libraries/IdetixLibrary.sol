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
}
