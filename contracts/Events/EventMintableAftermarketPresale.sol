// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import '../Mintable.sol';
import '../Aftermarket.sol';
import '../Event.sol';
import '../Presale.sol';

contract EventMintableAftermarketPresale is Event, Mintable, Aftermarket, Presale{

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
        Event(_owner, _hashFunction, _size, _digest, _identityContract, _identityApprover, _identityLevel, _erc20Contract)
        onlyAllowedGranularity(_granularity)
    public {
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
        require(out, IdetixLibrary.badGranularity);
        _;
    }
}
