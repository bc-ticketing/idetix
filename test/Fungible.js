const {cidToArgs, argsToCid} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");
const BigNumber = require("bignumber.js");

contract("Fungible", (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[2];
  const eventGuests = accounts.slice(3);

  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = new BigNumber("1000000000000000", 10);
  const supply = 5;
  const isNF = false;
  const finalizationTime = parseInt(Date.now()/1000) + 120; //two minutes in the future
  const identityContract = Identity.address;
  const identityLevel = 0;
  const erc20Contract = "0x0000000000000000000000000000000000000000";
  const granularity = 1;
  let ticketTypeId = null;
  let identity = null;
  let event = null;
  let eventFactory = null;
  let maxTicketsPerPerson = 0;

  before(async () => {
    // parse ipfs hash
    const args = cidToArgs(cid);

    // create new identity contract
    identity = await Identity.new();

    // register identity approver
    await identity.registerApprover(args.hashFunction, args.size, args.digest, {from: identityApprover});

    // create a new event factory contract
    eventFactory = await EventFactory.new(identity.address);

    // create a new event contract
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20Contract, granularity, {from: eventHost});

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEvents = await eventFactory.getPastEvents("EventCreated", { fromBlock: 1 });
    const eventContractAddress = pastSolidityEvents[pastSolidityEvents.length - 1].returnValues["_contractAddress"];

    // create new instance of the Event Contract
    event = await EventMintableAftermarketPresale.at(eventContractAddress);

    // create a new ticket type
    await event.createTypes(
      [args.hashFunction],
      [args.size],
      [args.digest],
      [isNF],
      [price.toFixed()],
      [finalizationTime],
      [supply],
      {from: eventHost}
    );

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEventsTicketType = await event.getPastEvents("TicketMetadata", { fromBlock: 1 });
    ticketTypeId = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["ticketTypeId"];

    // read the default value set for max tickets per person
    maxTicketsPerPerson = await event.maxTicketsPerPerson();
  });

  it("should return the event smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should create a fungible ticket type", async () => {
    await event.createTypes(
      [args.hashFunction],
      [args.size],
      [args.digest],
      [isNF],
      [price.toFixed()],
      [finalizationTime],
      [supply],
      {from: eventHost}
    );

    let ticketType = await event.ticketTypeMeta(ticketTypeId);

    assert.equal(
      new BigNumber(ticketType["price"]).toFixed(),
      price.toFixed(),
      "The ticket price is not set correctly."
    );

    assert.equal(
      ticketType["supply"].toNumber(),
      supply,
      "The supply is not set correctly."
    );

    assert.equal(
      ticketType["finalizationTime"],
      finalizationTime,
      "The finalization block is not set correctly."
    );

    const pastSolidityEventsTicketType = await event.getPastEvents("TicketMetadata", { fromBlock: 1 });
    const hashFunction = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["hashFunction"];
    const size = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["size"];
    const digest = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["digest"];

    assert.equal(
      argsToCid(hashFunction, size, digest),
      cid,
      "The finalization block is not set correctly."
    );

  });

  it("should mint 1 ticket for acc0", async () => {
    const numTickets = 1;

    await event.mintFungible(ticketTypeId, numTickets, [affiliate], {
      value: price.toFixed(),
      from: eventGuests[0],
    });

    var bigNumber = await event.tickets(ticketTypeId, eventGuests[0]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned correctly"
    );
  });

  it("should not allow minting more tickets than allowed", async () => {
    const numTickets = maxTicketsPerPerson + 1;

    try {
      await event.mintFungible(ticketTypeId, numTickets, [affiliate], {
        value: price.multipliedBy(numTickets).toFixed(),
        from: eventGuests[1],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

  it("should create multiple ticket types", async () => {
    const numTickets = maxTicketsPerPerson + 1;
    await event.createTypes(
      [args.hashFunction, args.hashFunction, args.hashFunction, args.hashFunction],
      [args.size, args.size, args.size, args.size],
      [args.digest, args.digest, args.digest, args.digest],
      [isNF, isNF, isNF, isNF],
      [price.toFixed(), price.toFixed(), price.toFixed(), price.toFixed()],
      [finalizationTime, finalizationTime, finalizationTime, finalizationTime],
      [supply, supply, supply, supply],
      {from: eventHost}
    );

    const numFungibleTicketTypes = await event.fNonce();

    assert.equal(
      6,
      numFungibleTicketTypes.toNumber(),
      "Cannot create multiple ticket types"
    );
  });

  it("should not allow unregistered identity approver to create an event", async () => {
    try {
      await event.createTypes(
        [args.hashFunction],
        [args.size],
        [args.digest],
        [isNF],
        [price.toFixed()],
        [finalizationTime],
        [supply],
        {from: eventGuests[0]}
      );
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

  it("should update the ticket type metadata", async () => {
    const cid2 = "Qma26Yo9HzebjUZdSH48adEskaWVk5bPj2gpPPA9qEiYVK";
    const args2 = cidToArgs(cid2);

    await event.updateType(ticketTypeId, args2.hashFunction, args2.size, args2.digest, {from:eventHost});

    var filter = { 'ticketTypeId': ticketTypeId}
    const pastSolidityEventsTicketType = await event.getPastEvents("TicketMetadata", filter, { fromBlock: 1 });
    const hashFunction = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["hashFunction"];
    const size = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["size"];
    const digest = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["digest"];

    assert.equal(
      cid2,
      argsToCid(hashFunction, size, digest),
      "The update ticket meta data event was not emitted correctly."
    );
  });

  it("should update the finalization time", async () => {
    const finalizationTime2 = parseInt(Date.now()/1000) + 240; //two minutes in the future
    await event.updateFinalizationTime(ticketTypeId, finalizationTime2, {from:eventHost});

    let ticketType = await event.ticketTypeMeta(ticketTypeId);

    assert.equal(
      finalizationTime2,
      ticketType["finalizationTime"],
      "The finalization time is not updated correctly."
    );
  });
});

//const e = await EventFactory.at("0x055b6e305864DC13E0b9F4ecB1591eE2e8a99C99")
//await e.createEvent("0x20", "0x20", "0x055b6e305864DC13E0b9F4ecB1591eE2e8a99C99", accounts[5], 3, "0x055b6e305864DC13E0b9F4ecB1591eE2e8a99C99", 4)