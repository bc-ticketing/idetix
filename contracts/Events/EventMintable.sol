// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import '../Mintable.sol';
import '../Event.sol';

contract EventMintable is Event, Mintable{

    constructor(address payable _owner, bytes1 _hashFunction, bytes1 _size, bytes32 _digest)
        Event(_owner, _hashFunction, _size, _digest)
        public {}

}
