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
});
