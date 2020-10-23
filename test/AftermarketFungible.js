const {cidToArgs, argsToCid, printQueues} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");
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
  const erc20Contract = "0x0000000000000000000000000000000000000000";
  const granularity = 1;
  let ticketTypeId = null;
  let identity = null;
  let eventFactory = null;
  let event = null;
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

  it("should buy 1 ticket for acc0", async () => {
    const numTickets = 1;

    await event.mintFungible(ticketTypeId, numTickets, [affiliate], {
      value: price.multipliedBy(numTickets).toFixed(),
      from: eventGuests[0],
    });

    var bigNumber = await event.tickets(ticketTypeId, eventGuests[0]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned correctly"
    );
  });

  it("should add acc0 selling queue (Aftermarket contract)", async () => {
    const numTickets = 1;

    await event.makeSellOrderFungibles(ticketTypeId, numTickets, queuePercentage, {
      from: eventGuests[0],
    });

    var queue = await event.sellingQueue(ticketTypeId, queuePercentage);

    assert.equal(
      queue["tail"].toNumber(),
      1,
      "The tail of the selling queue was set incorrectly"
    );

    assert.equal(
      queue["head"].toNumber(),
      0,
      "The head of the selling queue was set incorrectly"
    );

    await printQueues(event, ticketTypeId)
  });

  it("should buy the ticket from the selling queue acc0 -> acc1 (Aftermarket contract)", async () => {
    const numTickets = 1;

    await event.fillSellOrderFungibles(ticketTypeId, numTickets, queuePercentage, {
      value: price.multipliedBy(numTickets).toFixed(),
      from: eventGuests[1],
    });

    var bigNumber = await event.tickets(ticketTypeId, eventGuests[1]);

    assert.equal(bigNumber.toNumber(), numTickets, "The ticket was not added.");

    var bigNumber = await event.tickets(ticketTypeId, eventGuests[0]);

    assert.equal(bigNumber.toNumber(), 0, "The ticket was not subracted.");

    var queue = await event.sellingQueue(ticketTypeId, queuePercentage);

    assert.equal(
      queue["tail"].toNumber(),
      1,
      "The tail of the selling queue was set incorrectly"
    );

    assert.equal(
      queue["head"].toNumber(),
      1,
      "The head of the selling queue was set incorrectly"
    );
    await printQueues(event, ticketTypeId)
  });

  it("should add acc0 to buying queue (Aftermarket contract)", async () => {
    const numTickets = 1;

    await event.makeBuyOrder(ticketTypeId, numTickets, queuePercentage, {
      value: price.toFixed(),
      from: eventGuests[0],
    });

    var queue = await event.buyingQueue(ticketTypeId, queuePercentage);

    assert.equal(
      queue["tail"].toNumber(),
      1,
      "The tail of the buying queue was set incorrectly"
    );

    assert.equal(
      queue["head"].toNumber(),
      0,
      "The head of the buying queue was set incorrectly"
    );
  });

  it("should sell the ticket to the buying queue acc1 -> acc0 (Aftermarket contract)", async () => {
    const numTickets = 1;

    await event.fillBuyOrderFungibles(ticketTypeId, numTickets, queuePercentage, {
      from: eventGuests[1],
    });

    var bigNumber = await event.tickets(ticketTypeId, eventGuests[0]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned incorrectly"
    );

    var queue = await event.buyingQueue(ticketTypeId, queuePercentage);

    assert.equal(
      queue["tail"].toNumber(),
      1,
      "The tail of the buying queue was set incorrectly"
    );

    assert.equal(
      queue["head"].toNumber(),
      1,
      "The head of the buying queue was set incorrectly"
    );
  });

  it("should not allow buying more tickets than allowed", async () => {
    const moreThanMaxTicketsPerPerson = maxTicketsPerPerson + 1;

    const priceMaxTickets =  price.multipliedBy(maxTicketsPerPerson).toFixed();
    const priceMoreThanAllowed =  price.multipliedBy(moreThanMaxTicketsPerPerson).toFixed();

    await event.mintFungible(ticketTypeId, maxTicketsPerPerson, [], { value: priceMaxTickets , from: eventGuests[2] });
    await event.makeSellOrderFungibles(ticketTypeId, maxTicketsPerPerson, queuePercentage, { from: eventGuests[2] });

    await event.mintFungible(ticketTypeId, maxTicketsPerPerson, [], { value: priceMaxTickets, from: eventGuests[3] });
    await event.makeSellOrderFungibles(ticketTypeId, maxTicketsPerPerson, queuePercentage, { from: eventGuests[3] });

    try {
      await event.fillSellOrderFungibles(ticketTypeId, moreThanMaxTicketsPerPerson, queuePercentage, {  value: priceMoreThanAllowed, from: eventGuests[4] });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

  it("should not allow buying multiple tickets less than the multiple price", async () => {
    const priceTicketsAllowed = price.multipliedBy(maxTicketsPerPerson).toFixed();
    await event.mintFungible(ticketTypeId, maxTicketsPerPerson, [], { value: priceTicketsAllowed , from: eventGuests[5] });
    await event.makeSellOrderFungibles(ticketTypeId, maxTicketsPerPerson, queuePercentage, { from: eventGuests[5] });

    try {
      await event.fillSellOrderFungibles(ticketTypeId, maxTicketsPerPerson, queuePercentage, { value: price.toFixed(), from: eventGuests[6] });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });
});
