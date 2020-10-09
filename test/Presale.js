const {cidToArgs, argsToCid} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

const skipBlock = async (n) => {
  for(i=0; i<n; i++){
    await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_mine",
      id: 12345
    }, function(err, result) {});
  }
}


contract("Presale", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const isNF = false;
  const finalizationTime = parseInt(Date.now()/1000) + 120; //two minutes in the future
  const supplyPresale = 7;
  const durationInBlocks = 50;
  const identityContract = Identity.address;
  const identityApprover = "0xB18D4a541216438D4480fBA37129e82a4ee49E88";
  const identityLevel = 0;
  const erc20Contract = "0x0000000000000000000000000000000000000000";
  const granularity = 1;
  let maxTicketsPerPerson;
  let currentBlockNumber;
  let ticketType;
  let lotteryBlocknumber;
  let event = null;
  let ticketTypeId = null;
  let identity = null;

  before(async () => {
    // parse ipfs hash
    const args = cidToArgs(cid);

    // create new identity contract
    identity = await Identity.new();

    // create a new event factory contract
    eventFactory = await EventFactory.new(identity.address);

    // create a new event
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20Contract, granularity);

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEvents = await eventFactory.getPastEvents("EventCreated", { fromBlock: 1 });
    const eventContractAddress = pastSolidityEvents[pastSolidityEvents.length - 1].returnValues["_contractAddress"];

    // create new instance of the Event Contract
    event = await EventMintableAftermarketPresale.at(eventContractAddress);

    // read the default value set for max tickets per person
    maxTicketsPerPerson = await event.maxTicketsPerPerson();

    // set future block number
    currentBlock = await web3.eth.getBlock("latest");
    lotteryBlocknumber = currentBlock.number + durationInBlocks;
  });

  it("should create a presale", async () => {
    await event.createPresaleTypes(
      [args.hashFunction],
      [args.size],
      [args.digest],
      [isNF],
      [price],
      [finalizationTime],
      [supplyPresale],
      [lotteryBlocknumber]
    );

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEventsTicketType = await event.getPastEvents("TicketMetadata", { fromBlock: 1 });
    ticketTypeId = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["ticketTypeId"];

    ticketType = await event.ticketTypeMeta(ticketTypeId);
    maxTicketsPerPerson = await event.maxTicketsPerPerson();

    let presale = await event.lotteries(ticketTypeId);

    assert.equal(
      presale["supply"],
      supplyPresale,
      "The presale supply is not set correctly."
    );

    assert.equal(
      presale["block"],
      lotteryBlocknumber,
      "The block number is not set correctly."
    );
  });

  it("should add account0 a presale", async () => {
    await event.joinPresale(ticketTypeId, {from:accounts[0], value:price});

    const currentNonce = await event.nonces(ticketTypeId);
    assert.equal(
      currentNonce,
      1,
      "The nonce is not set correctly."
    );

    const entry = await event.entries(ticketTypeId,  accounts[0]);

    assert.equal(
      entry,
      1,
      "The entry is not set correctly."
    );
  });

  it("should add account1 a presale", async () => {
    await event.joinPresale(ticketTypeId, {from:accounts[1], value:price});

    const currentNonce = await event.nonces(ticketTypeId);
    assert.equal(
      currentNonce,
      2,
      "The nonce is not set correctly."
    );

    const entry = await event.entries(ticketTypeId,  accounts[1]);

    assert.equal(
      entry,
      2,
      "The entry is not set correctly."
    );
  });

  it("should add account2 a presale", async () => {
    await event.joinPresale(ticketTypeId, {from:accounts[2], value:price});

    const currentNonce = await event.nonces(ticketTypeId);
    assert.equal(
      currentNonce,
      3,
      "The nonce is not set correctly."
    );

    const entry = await event.entries(ticketTypeId,  accounts[2]);

    assert.equal(
      entry,
      3,
      "The entry is not set correctly."
    );
  });

  it("should skip to the end of the lottery", async () => {
    let previousBlock = await web3.eth.getBlock("latest");

    await skipBlock(durationInBlocks);

    currentBlock = await web3.eth.getBlock("latest");

    assert.equal(
      currentBlock.number,
      previousBlock.number + durationInBlocks,
      "The block is not mined correctly."
    );
  });

  it("should add a ticket to account0", async () => {
    await event.claim(ticketTypeId, {from:accounts[0]});
    const numberTickets = await event.tickets(ticketTypeId, accounts[0])

    assert.equal(
      1,
      numberTickets.toNumber(),
      "The ticket is not added correctly."
    );
  });

  it("should add a ticket to account1", async () => {
    await event.claim(ticketTypeId, {from:accounts[1]});
    const numberTickets = await event.tickets(ticketTypeId, accounts[1])

    assert.equal(
      1,
      numberTickets.toNumber(),
      "The ticket is not added correctly."
    );
  });

  it("should add a ticket to account2", async () => {
    await event.claim(ticketTypeId, {from:accounts[2]});
    const numberTickets = await event.tickets(ticketTypeId, accounts[2])

    assert.equal(
      1,
      numberTickets.toNumber(),
      "The ticket is not added correctly."
    );
  });
});

