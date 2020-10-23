const {cidToArgs, argsToCid, printQueues} = require("idetix-utils");
const BigNumber = require("bignumber.js");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("AftermarketNonFungible", (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[2];
  const eventGuests = accounts.slice(3);

  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = new BigNumber("1000000000000000", 10);
  const supply = 10;
  const isNF = true;
  const finalizationTime = parseInt(Date.now()/1000) + 1200; //two minutes in the future
  const queuePercentage = 100;
  const granularity = 4;
  const identityContract = Identity.address;
  const identityLevel = 0;
  const erc20Contract = "0x0000000000000000000000000000000000000000";

  let eventFactory = null;
  let event = null;
  let maxTicketsPerPerson = 0;
  let identity = null;
  let ticketTypeId = null;
  let ids = null;

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

    ids = [
      new BigNumber(ticketTypeId).plus(1, 10),
      new BigNumber(ticketTypeId).plus(2, 10),
      new BigNumber(ticketTypeId).plus(3, 10),
      new BigNumber(ticketTypeId).plus(4, 10),
      new BigNumber(ticketTypeId).plus(5, 10),
      new BigNumber(ticketTypeId).plus(6, 10),
      new BigNumber(ticketTypeId).plus(7, 10),
      new BigNumber(ticketTypeId).plus(8, 10),
      new BigNumber(ticketTypeId).plus(9, 10),
      new BigNumber(ticketTypeId).plus(10, 10)
    ]
  });

  it("make buy order for eventGuest0", async () => {
    const percentage = 50;
    const numTickets = 4;
    await event.makeBuyOrder(ticketTypeId, numTickets, percentage, {
      from: eventGuests[0],
      value: price.multipliedBy(numTickets).multipliedBy(percentage/100).toFixed()
    });

    await event.makeBuyOrder(ticketTypeId, numTickets, percentage, {
      from: eventGuests[1],
      value: price.multipliedBy(numTickets).multipliedBy(percentage/100).toFixed()
    });

    await event.makeBuyOrder(ticketTypeId, numTickets, percentage, {
      from: eventGuests[2],
      value: price.multipliedBy(numTickets).multipliedBy(percentage/100).toFixed()
    });

    await event.makeBuyOrder(ticketTypeId, numTickets, percentage, {
      from: eventGuests[3],
      value: price.multipliedBy(numTickets).multipliedBy(percentage/100).toFixed()
    });

    await printQueues(event, ticketTypeId);

    await event.withdrawBuyOrder(ticketTypeId, 4, percentage, 0, {
      from: eventGuests[0]
    });

    await event.withdrawBuyOrder(ticketTypeId, 4, percentage, 1, {
      from: eventGuests[1]
    });

    await event.withdrawBuyOrder(ticketTypeId, 4, percentage, 2, {
      from: eventGuests[2]
    });

    await printQueues(event, ticketTypeId);

    const queueBefore = await event.buyingQueue(ticketTypeId, percentage);
    assert.equal(0, queueBefore["head"], "the head was not set correctly before");
    assert.equal(4, queueBefore["tail"], "the tail was not set correctly before");

    const idsToBuy = [ids[0], ids[1]];

    await event.mintNonFungibles(idsToBuy, [affiliate], {
      value: price.multipliedBy(idsToBuy.length),
      from: eventGuests[4],
    });

    await event.fillBuyOrderNonFungibles(idsToBuy, [percentage, percentage], {
      from: eventGuests[4]
    });
    await printQueues(event, ticketTypeId);

    const queueAfter = await event.buyingQueue(ticketTypeId, percentage);
    assert.equal(3, queueAfter["head"], "the head was not set correctly after");
    assert.equal(4, queueAfter["tail"], "the tail was not set correctly after");


    assert.equal(
      (await event.tickets(ticketTypeId, eventGuests[0])).toNumber(),
      0,
      "The ticket was not assigned correctly"
    );
    assert.equal(
      (await event.tickets(ticketTypeId, eventGuests[1])).toNumber(),
      0,
      "The ticket was not assigned correctly"
    );
    assert.equal(
      (await event.tickets(ticketTypeId, eventGuests[2])).toNumber(),
      0,
      "The ticket was not assigned correctly"
    );
    assert.equal(
      (await event.tickets(ticketTypeId, eventGuests[3])).toNumber(),
      2,
      "The ticket was not assigned correctly"
    );
    assert.equal(
      (await event.tickets(ticketTypeId, eventGuests[4])).toNumber(),
      0,
      "The ticket was not assigned correctly"
    );

    // assert.equal(
    //   await event.tickets(ticketTypeId, eventGuests[4]).toNumber(),
    //   2,
    //   "The ticket was not assigned correctly"
    // );

  });
});
