// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import '../Mintable.sol';
import '../Aftermarket.sol';
import '../Event.sol';

// "0x2e0640A9D4E3754F91fFDCC9CDfeC4c8b2EF8aF7","0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000"
// "0x12","0x20","0x6162636400000000000000000000000000000000000000000000000000000000", true, 1, 100, 100
contract EventMintableAftermarket is Event, Mintable, Aftermarket {

    constructor(
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
        Event(_owner, _hashFunction, _size, _digest, _identityContract, _identityApprover, _identityLevel, _erc20Contract)
        onlyAllowedGranularity(_granularity)
    {
        for(uint8 i = 1; i<=_granularity; i++){
            allowedPercentages[(100/_granularity)*i] = true;
        }
        granularity = _granularity;
    }

    //The granularity must be a factor of 100.
    modifier onlyAllowedGranularity(uint8 _granularity){
        bool out = false;
        for(uint8 i=0; i<9; i++){
            if(allowedGranularities[i]==_granularity){
                out=true;
                break;
            }
        }
        require(out, "BadGranularity");
        _;
    }
}
