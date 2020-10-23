const {cidToArgs, argsToCid, printQueues} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");
const BigNumber = require("bignumber.js");

contract("AftermarketFungibleDynamicSelling", (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[2];
  const eventGuests = accounts.slice(3);

  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = new BigNumber("1000000000000000", 10);
  const supply = 10;
  const isNF = false;
  const finalizationTime = parseInt(Date.now()/1000) + 1200; //two minutes in the future
  const granularity = 4;
  const identityContract = Identity.address;
  const identityLevel = 0;
  const erc20Contract = "0x0000000000000000000000000000000000000000";
  let ticketTypeId = null;
  let identity = null;
  let eventFactory = null;
  let event = null;

  before(async () => {
    // parse ipfs hash
    const args = cidToArgs(cid);

    // create new identity contract
    identity = await Identity.new();

    // create a new event factory contract
    eventFactory = await EventFactory.new(identity.address);

    // register identity approver
    await identity.registerApprover(args.hashFunction, args.size, args.digest, {from: identityApprover});

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

  it("should buy 4 tickets for acc0 and post 2 for sale for 100% one for 75% and one for 50%", async () => {
    await event.mintFungible(ticketTypeId, 4, [affiliate], {
      value: price.multipliedBy(4).toFixed(),
      from: eventGuests[0],
    });
    await event.makeSellOrderFungibles(ticketTypeId, 1, 100, {
      from: eventGuests[0]
    })
    await event.makeSellOrderFungibles(ticketTypeId, 1, 75, {
      from: eventGuests[0]
    })
    await event.makeSellOrderFungibles(ticketTypeId, 1, 50, {
      from: eventGuests[0]
    })
    await printQueues(event, ticketTypeId);
  });

  it("should buy 4 tickets for acc0 and post 3 for sale for 100% one for 75%", async () => {
    await event.mintFungible(ticketTypeId, 4, [affiliate], {
      value: price.multipliedBy(4).toFixed(),
      from: eventGuests[1],
    });

    await event.makeSellOrderFungibles(ticketTypeId, 3, 100, {
      from: eventGuests[1]
    })
    await event.makeSellOrderFungibles(ticketTypeId, 1, 75, {
      from: eventGuests[1]
    })
    await printQueues(event, ticketTypeId);
  });
      
  it("should fill order sell order in queue 75% 1 ticket", async () => {
    event.fillSellOrderFungibles(ticketTypeId, 1, 75, {
      from:eventGuests[4],
      value:price.multipliedBy(0.75).toFixed()
    });
    await printQueues(event, ticketTypeId)
  });

  it("should buy a ticket from the buying queue for 75%", async () => {
    await event.fillSellOrderFungibles(ticketTypeId, 1, 75, {
      value: price.multipliedBy(1 * 0.75).toFixed(),
      from: eventGuests[6]
    });
    await printQueues(event, ticketTypeId)
  });

  it("should remove acc0 from the buying queue 100% 1 ticket", async () => {
    event.withdrawSellOrderFungible(ticketTypeId, 1, 100, 0, {
      from: eventGuests[0]
    });
    await printQueues(event, ticketTypeId)

  });
})