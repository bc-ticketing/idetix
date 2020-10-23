const {cidToArgs, argsToCid} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");
const TestERC20Token = artifacts.require("TestERC20Token");
const BigNumber = require("bignumber.js");

contract("AftermarketFungible", (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[2];
  const eventGuests = accounts.slice(3);

  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const price = new BigNumber("1000000000000000", 10);
  const supply = 5;
  const isNF = false;
  const finalizationTime = parseInt(Date.now()/1000) + 1200; //two minutes in the future
  const queuePercentage = 100;
  const identityLevel = 0;
  const granularity = 1;
  let ticketTypeId = null;
  let identity = null;
  let eventFactory = null;
  let event = null;
  let maxTicketsPerPerson = 0;
  let erc20 = null;

  before(async () => {
    // parse ipfs hash
    const args = cidToArgs(cid);

    // create new erc20 token contract
    erc20 = await TestERC20Token.new(new BigNumber("1000000000000000000000", 10).toFixed(), "TestToken", "TST", {from:eventGuests[0]});

    // create new identity contract
    identity = await Identity.new();

    // register identity approver
    await identity.registerApprover(args.hashFunction, args.size, args.digest, {from: identityApprover});

    // create a new event factory contract
    eventFactory = await EventFactory.new(identity.address);

    // create a new event contract
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20.address, granularity, {from: eventHost});

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

  it("should not allow acc0 to buy a ticket without the approval in the erc20 contract", async () => {
    const numTickets = 1;
    var bigNumber = await event.tickets(ticketTypeId, eventGuests[0]);

    try {
      await event.mintFungible(ticketTypeId, numTickets, [affiliate], {
        value: price.multipliedBy(numTickets),
        from: eventGuests[0],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

  it("should buy 1 ticket for acc0", async () => {
    const numTickets = 1;

    await erc20.approve(event.address, price.multipliedBy(numTickets).toFixed(), {from:eventGuests[0]});

    await event.mintFungible(ticketTypeId, numTickets, [affiliate], {
      value: price.multipliedBy(numTickets),
      from: eventGuests[0],
    });

    var bigNumber = await event.tickets(ticketTypeId, eventGuests[0]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned correctly"
    );
  });
});
