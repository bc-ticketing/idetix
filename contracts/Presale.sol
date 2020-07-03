// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import './Event.sol';
import './Mintable.sol';


abstract contract Presale is Event{

    struct Lottery{
        uint256 numberTickets;
        uint256 block;
    }

    /**
    * @dev Must start at 1, allowing to check if address has participated in presale.
    *
    */
    //type => nonce
    mapping(uint256 => uint256) nonces;
    //type => address => lucky number
    mapping(uint256 => mapping(address => uint256)) entries;
    mapping(uint256 => Lottery) lotteries;

    function createPresale(uint256 _type, uint256 _numberTickets, uint256 _block)
        public
        onlyType(_type)
        onlyFutureBlock(_block)
    {
        lotteries[_type] = Lottery(_numberTickets, _block);
    }

    function joinPresale(uint256 _type)
        external
        payable
        onlyType(_type)
        onlyVerified(msg.sender)
    {
        nonces[_type] += 1;
        entries[_type][msg.sender] = nonces[_type];
    }


    /**
    * @dev Either claims the ticket or the ticket price is refunded.
    *
    */
    function claim(uint256 _type)
        public
//        onlyAfterLotteryDrawn(lotteries[_type]._block)
        onlyParticipants(_type, msg.sender)
    {
        if(hasWon(_type)){
            tickets[_type][msg.sender] += 1;
        }else{
            (msg.sender).transfer(ticketTypeMeta[_type].price);
        }
    }


    function hasWon(uint256 _type)
        internal
        view
        returns(bool)
    {
        uint256 luckyNumber = getRandomNumber(1, lotteries[_type].numberTickets, lotteries[_type].block);
        uint256 personalNumber = entries[_type][msg.sender];
        uint256 upperBound = luckyNumber.add(lotteries[_type].numberTickets);
        uint256 overflow;
        if(upperBound > nonces[_type]){
            overflow = luckyNumber.add(lotteries[_type].numberTickets).sub(nonces[_type]);
        }

        if(overflow > 0){
            return (personalNumber >= luckyNumber && personalNumber <= nonces[_type]) || (personalNumber >= 1 && personalNumber <= overflow);
        }else{
            return (personalNumber >= luckyNumber && personalNumber <= upperBound);
        }
    }

    // @notice This function can be used to generate a random number based on the specific future blockhash
    // @dev The miner of the defined block number has the possiblity to withhold a mined block in order to manipulate the randomness.
    // @param min The lower boundary of the random range (min is part of the range)
    // @param max The upper boundary of the random range (max is part of the range)
    // @param blockNumber The block number which is used to create the random numbers
    // @return A random integer greater or equal to min and smaller or equal to max
    function getRandomNumber(uint256 min, uint256 max, uint256 blockNumber)
        public view
        onlyPastBlock(blockNumber)
        returns(uint256)
    {
        return (uint256(blockhash(blockNumber)) % (max - min + 1)) + min;
    }

    modifier onlyAfterLotteryDrawn(uint256 _block){
        require(block.number > _block, "The lottery is not passed yet.");
        _;
    }

    modifier onlyFutureBlock(uint256 _block){
        require(block.number < _block, "The block must be a future block.");
        _;
    }

    modifier onlyPastBlock(uint256 _block){
        require(block.number > _block, "The block must be a past block.");
        _;
    }

    modifier onlyNonParticipants(uint256 _type, address _address){
        require(entries[_type][_address] == 0, "This address already has joined the presale.");
        _;
    }

    modifier onlyParticipants(uint256 _type, address _address){
        require(entries[_type][_address] != 0, "This address has not joined the presale.");
        _;
    }
}
