const {cidToArgs, argsToCid, printQueues} = require("idetix-utils");
const BigNumber = require("bignumber.js");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("AftermarketNonFungibleDynamicBuying", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 10;
  const isNF = true;
  const finalizationBlock = 1000;
  const granularity = 4;
  const identityContract = Identity.address;
  const identityApprover = "0xB18D4a541216438D4480fBA37129e82a4ee49E88";
  const identityLevel = 0;
  const erc20Contract = "0x0000000000000000000000000000000000000000";

  let eventFactory = null;
  let event = null;
  let ticketTypeId = null;
  let identity = null;
  let ids = null;

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
      [finalizationBlock],
      [supply]
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

  it("should return the event smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });


  it("should fill buying queues", async () => {
    await event.makeBuyOrder(ticketTypeId, 1, 100, {
      from: accounts[1],
      value: 1 * price
    });

    await event.makeBuyOrder(ticketTypeId, 1, 100, {
      from: accounts[2],
      value: 1 * price
    });

    await event.makeBuyOrder(ticketTypeId, 2, 75, {
      from: accounts[3],
      value: 2 * price
    });

    await event.makeBuyOrder(ticketTypeId, 4, 100, {
      from: accounts[4],
      value: 4 * price
    });

    await event.makeBuyOrder(ticketTypeId, 3, 25, {
      from: accounts[5],
      value: 3 * price
    });

    await event.makeBuyOrder(ticketTypeId, 1, 100, {
      from: accounts[5],
      value: 1 * price
    });

    await event.makeBuyOrder(ticketTypeId, 1, 100, {
      from: accounts[5],
      value: 1 * price
    });
    await printQueues(event, ticketTypeId);
  });

  it("should remove acc4 from the queue", async () => {
    await event.withdrawBuyOrder(ticketTypeId, 3, 100, 2, {
      from: accounts[4],
    });
    await printQueues(event, ticketTypeId);
  });

  it("should buy tickets for acc0 and sell them to queue 100", async () => {
    const idsToBuy = [ids[0], ids[1], ids[2], ids[4]];

    await event.mintNonFungibles(idsToBuy, {
      value: price * idsToBuy.length,
      from: accounts[0],
    });

    await event.fillBuyOrderNonFungibles(idsToBuy, 100, {
      from: accounts[0]
    });

    await printQueues(event, ticketTypeId);
  });
})