// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;

import './Event.sol';
import './Mintable.sol';

abstract contract Presale is Event, Mintable{

    event PresaleCreated(uint256 ticketType, uint256 supply, uint256 block);
    event PresaleJoined(address indexed user, uint256 luckyNumber);
    event TicketClaimed(address indexed user, uint256 ticketType);
    event TicketPriceRefunded(address indexed user);

    struct Lottery{
        uint256 supply;
        uint256 block;
    }

    /**
    * @dev Must start at 1, allowing to check if address has participated in presale.
    *
    */
    //type => nonce
    mapping(uint256 => uint256) public nonces;
    //type => address => lucky number
    mapping(uint256 => mapping(address => uint256)) public entries;
    mapping(uint256 => Lottery) public lotteries;
    //type => nf ticket id
    mapping(uint256 => uint256) public nfMintCounter;

    function createPresaleType(
        bytes1 _hashFunction,
        bytes1 _size,
        bytes32 _digest,
        bool _isNF,
        uint256 _price,
        uint256 _finalizationBlock,
        uint256 _supply,
        uint256 _block
    )
        public
        onlyFutureBlock(_block)
    {
        uint256 ticketTpye = createType(_hashFunction, _size, _digest, _isNF, _price, _finalizationBlock, _supply);
        lotteries[ticketTpye] = Lottery(_supply, _block);
        emit PresaleCreated(ticketTpye, _supply, _block);
    }

    function joinPresale(uint256 _type)
        external
        payable
        onlyType(_type)
        onlyVerified(msg.sender)
        onlyBeforeLotteryEnd(lotteries[_type].block)
        onlyCorrectValue(_type, 1, msg.value, 100)
    {
        nonces[_type] += 1;
        entries[_type][msg.sender] = nonces[_type];
        emit PresaleJoined(msg.sender, nonces[_type]);
    }


    /**
    * @dev Either claims the ticket or the ticket price is refunded.
    *
    */
    function claim(uint256 _type)
        public
        onlyAfterLotteryEnd(lotteries[_type].block)
        onlyParticipants(_type, msg.sender)
        onlyType(_type)
    {
        if(hasWon(_type)){
            if(IdetixLibrary.isFungible(_type)){
                _mintFungible(_type, 1);
            }else{
                nfMintCounter[_type] = nfMintCounter[_type].add(1);
                _mintNonFungible(_type.add(nfMintCounter[_type]));
            }
            emit TicketClaimed(msg.sender, _type);
        }else{
            transferValue(address(this), msg.sender, ticketTypeMeta[_type].price);
            emit TicketPriceRefunded(msg.sender);
        }
        entries[_type][msg.sender] = 0; // disable multiple refunds
    }

    function hasWon(uint256 _type)
        public
        view
        returns(bool)
    {
        uint256 personalNumber = entries[_type][msg.sender];
        uint256 numberParticipants = nonces[_type];
        uint256 lotteryNumber = getRandomNumber(1, numberParticipants, lotteries[_type].block);

        // upperbound: nonce that still wins a ticket
        uint256 upperBound = lotteryNumber.add(lotteries[_type].supply - 1);

        // double overflow: number of participant less than total available tickets -> all registrants win a ticket
        if(numberParticipants <= lotteries[_type].supply){
            return true;
        }

        // no overflow: the selected range of indexes does not exceed the number of participants
        else if(upperBound <= numberParticipants){
            return personalNumber >= lotteryNumber && personalNumber <= upperBound ? true:false;
        }

        // overflow: the selected range exceeds the number of participants and needs
        else{
            uint256 overflowUpperBound = upperBound.sub(numberParticipants);
            return (personalNumber >= lotteryNumber && personalNumber <= numberParticipants) || (personalNumber >= 1 && personalNumber <= overflowUpperBound) ? true:false;
        }
    }

    // @notice This function can be used to generate a random number based on the specific future blockhash
    // @dev The miner of the defined block number has the possibility to withhold a mined block in order to manipulate the randomness.
    // @param min The lower boundary of the random range (min is part of the range)
    // @param max The upper boundary of the random range (max is part of the range)
    // @param blockNumber The block number which is used to create the random numbers
    // @return A random integer greater or equal to min and smaller or equal to max
    function getRandomNumber(uint256 min, uint256 max, uint256 blockNumber)
        private view
        onlyPastBlock(blockNumber)
        returns(uint256)
    {
        return (uint256(blockhash(blockNumber)) % (max - min + 1)) + min;
    }

    // The block must be a future block
    modifier onlyAfterLotteryEnd(uint256 _block){
        require(block.number > _block, "LotteryNotPast");
        _;
    }

    // The lottery is already over
    modifier onlyBeforeLotteryEnd(uint256 _block){
        require(block.number <= _block, "LotteryNotOngoing");
        _;
    }

    // The block must be a future block
    modifier onlyFutureBlock(uint256 _block){
        require(block.number < _block, "BadBlock1");
        _;
    }

    // The lottery is already over
    modifier onlyPastBlock(uint256 _block){
        require(block.number > _block, "BadBlock2");
        _;
    }

    // This address already has joined the presale
    modifier onlyNonParticipants(uint256 _type, address _address){
        require(entries[_type][_address] == 0, "BadAddr1");
        _;
    }

    modifier onlyParticipants(uint256 _type, address _address){
        require(entries[_type][_address] != 0, "BadAddr2");
        _;
    }
}
