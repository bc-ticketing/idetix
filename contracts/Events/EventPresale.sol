// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import '../Presale.sol';
import '../Event.sol';

contract EventPresale is Event, Presale {
    constructor(
        address payable _owner,
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        address _identityContract,
        address _identityApprover,
        uint8 _identityLevel,
        address _erc20Contract
    )
        public
        Event(_owner, _hashFunction, _size, _digest, _identityContract, _identityApprover, _identityLevel, _erc20Contract)
    {}
}
