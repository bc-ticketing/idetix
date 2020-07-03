// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import '../Mintable.sol';
import '../Aftermarket.sol';
import '../Event.sol';


// "0x2e0640A9D4E3754F91fFDCC9CDfeC4c8b2EF8aF7","0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000"
// "0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000", true, 1, 100, 100
contract EventMintableAftermarket is Event, Mintable, Aftermarket{

    constructor(address payable _owner, bytes1 _hashFunction, bytes1 _size, bytes32 _digest)
        Event(_owner, _hashFunction, _size, _digest)
        public {}

}
