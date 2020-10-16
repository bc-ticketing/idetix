const {cidToArgs, argsToCid} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");
const BigNumber = require("bignumber.js");

const skipBlock = async (n) => {
  for(i=0; i<n; i++){
    await web3.eth.getBlock("latest");
    await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_mine",
      id: 12345
    }, function(err, result) {});
  }
}

contract("PresaleOverflowFungible", (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[2];
  const eventGuests = accounts.slice(3);

  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = new BigNumber("1000000000000000", 10);
  const isNF = false;
  const finalizationTime = parseInt(Date.now()/1000) + 120; //two minutes in the future
  const supplyPresale = 5;
  const durationInBlocks = 50;
  const identityContract = Identity.address;
  const identityLevel = 0;
  const erc20Contract = "0x0000000000000000000000000000000000000000";
  const granularity = 1;
  let maxTicketsPerPerson;
  let currentBlockNumber;
  let lotteryBlocknumber;
  let eventFactory = null;
  let event = null;
  let ticketType = null;
  let ticketTypeId = null;


  before(async () => {
    // parse ipfs hash
    const args = cidToArgs(cid);

    // create new identity contract
    identity = await Identity.new();

    // register identity approver
    await identity.registerApprover(args.hashFunction, args.size, args.digest, {from: identityApprover});

    // create a new event factory contract
    eventFactory = await EventFactory.new(identity.address);

    // create a new event
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20Contract, granularity, {from: eventHost});

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEvents = await eventFactory.getPastEvents("EventCreated", { fromBlock: 1 });
    const eventContractAddress = pastSolidityEvents[pastSolidityEvents.length - 1].returnValues["_contractAddress"];

    // create new instance of the Event Contract
    event = await EventMintableAftermarketPresale.at(eventContractAddress);

    // set future block number
    currentBlock = await web3.eth.getBlock("latest");
    lotteryBlocknumber = currentBlock.number + durationInBlocks;

    // create a new ticket type
    await event.createPresaleTypes(
      [args.hashFunction],
      [args.size],
      [args.digest],
      [isNF],
      [price.toFixed()],
      [finalizationTime],
      [supplyPresale],
      [lotteryBlocknumber],
      {from: eventHost}
    );

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEventsTicketType = await event.getPastEvents("TicketMetadata", { fromBlock: 1 });
    ticketTypeId = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["ticketTypeId"];

    // read the default value set for max tickets per person
    maxTicketsPerPerson = await event.maxTicketsPerPerson();

  });

  it("should add all event guests to the presale", async () => {
    for(account of eventGuests){
      await event.joinPresale(ticketTypeId, {from:account, value:price.toFixed()});
    }

    const currentNonce = await event.nonces(ticketTypeId);

    assert.equal(
      eventGuests.length,
      currentNonce,
      "The nonce is not set correctly."
    );
  });

  it("should skip to the end of the lottery", async () => {
    let previousBlock = await web3.eth.getBlock("latest");

    await skipBlock(durationInBlocks + 1);

    currentBlock = await web3.eth.getBlock("latest");

    assert.isAtLeast(
      currentBlock.number, previousBlock.number + durationInBlocks,
      "The block is not mined correctly."
    );
  });

  it("should should only assign the correct amount of tickets available accross all accounts.", async () => {
    for(account of eventGuests){
      await event.claim(ticketTypeId, {from:account});
    }

    let assignedTickets = 0;

    for(account of eventGuests){
      let amount = await event.tickets(ticketTypeId, account);
      console.log(account + " :" + amount.toNumber())
      assignedTickets += amount.toNumber();
    }

    assert.equal(
      assignedTickets,
      supplyPresale,
      "The number of tickets was not assigned correctly."
    );
  });
});

