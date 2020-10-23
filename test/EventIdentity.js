const {cidToArgs, argsToCid} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");
const BigNumber = require("bignumber.js");

contract("EventIdentity", (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[2];
  const eventGuests = accounts.slice(3);

  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = new BigNumber("1000000000000000", 10).toFixed();
  const supply = 5;
  const isNF = false;
  const finalizationTime = parseInt(Date.now()/1000) + 1200; //two minutes in the future
  const identityLevel = 3;
  const erc20Contract = "0x0000000000000000000000000000000000000000";
  const granularity = 1;
  let eventFactory = null;
  let event = null;
  let maxTicketsPerPerson = 0;
  let identityContract = null;
  let ticketTypeId = null;
  let identity = null;


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
      [price],
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
      [price],
      [finalizationTime],
      [supply],
      {from: eventHost}
    );

    let ticketType = await event.ticketTypeMeta(ticketTypeId);
  });

  it("should register acc0 as approver and acc1 as verified with level 3", async () => {
    await identity.approveIdentity(eventGuests[1], identityLevel, {from: identityApprover});

    let bigNumber = await identity.getSecurityLevel(identityApprover, eventGuests[1]);
    assert.equal(
      bigNumber.toNumber(),
      identityLevel,
      "The identity level was assigned correctly"
    );
  });

  it("should mint 1 ticket for acc1", async () => {
    const numTickets = 1;

    await event.mintFungible(ticketTypeId, numTickets, [], {
      value: price,
      from: eventGuests[1],
    });

    var bigNumber = await event.tickets(ticketTypeId, eventGuests[1]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned correctly"
    );
  });

  it("should not allow acc2 to mint a ticket since not verified", async () => {
    const numTickets = 1;

    try {
      await event.mintFungible(ticketTypeId, numTickets, [], {
        value: price,
        from: eventGuests[2],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });
});
