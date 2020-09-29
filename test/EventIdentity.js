const {cidToArgs, argsToCid} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("EventIdentity", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 5;
  const isNF = false;
  const finalizationTime = parseInt(Date.now()/1000) + 120; //two minutes in the future
  const identityApprover = accounts[0];
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

    // create a new event factory contract
    eventFactory = await EventFactory.new(identity.address);

    // create a new event contract
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20Contract, granularity);

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
      [supply]
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
      [supply]
    );

    let ticketType = await event.ticketTypeMeta(ticketTypeId);
  });

  it("should register acc0 as approver and acc1 as verified with level 3", async () => {
    await identity.registerApprover(args.size, args.hashFunction, args.digest, {from: accounts[0]});
    await identity.approveIdentity(accounts[1], identityLevel, {from: accounts[0]});

    let bigNumber = await identity.getSecurityLevel(accounts[0], accounts[1]);
    assert.equal(
      bigNumber.toNumber(),
      identityLevel,
      "The identity level was assigned correctly"
    );
  });

  it("should mint 1 ticket for acc1", async () => {
    const numTickets = 1;

    await event.mintFungible(ticketTypeId, numTickets, {
      value: price,
      from: accounts[1],
    });

    var bigNumber = await event.tickets(ticketTypeId, accounts[1]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned correctly"
    );
  });

  it("should not allow acc2 to mint a ticket since not verified", async () => {
    const numTickets = 1;

    try {
      await event.mintFungible(ticketTypeId, numTickets, {
        value: price,
        from: accounts[2],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });
});
