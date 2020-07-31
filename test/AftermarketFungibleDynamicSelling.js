const {cidToArgs, argsToCid, printQueues} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("AftermarketFungibleDynamicSelling", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 10;
  const isNF = false;
  const finalizationBlock = 1000;
  const granularity = 4;
  const identityContract = Identity.address;
  const identityApprover = "0xB18D4a541216438D4480fBA37129e82a4ee49E88";
  const identityLevel = 0;
  const erc20Contract = "0x1Fe2b9481B57442Ea4147A0E0A5cF22245E3546E";
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

    // create a new event contract
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20Contract, granularity);

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEvents = await eventFactory.getPastEvents("EventCreated", { fromBlock: 1 });
    const eventContractAddress = pastSolidityEvents[pastSolidityEvents.length - 1].returnValues["_contractAddress"];

    // create new instance of the Event Contract
    event = await EventMintableAftermarketPresale.at(eventContractAddress);

    // create a new ticket type
    await event.createType(
      args.hashFunction,
      args.size,
      args.digest,
      isNF,
      price,
      finalizationBlock,
      supply
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
    await event.mintFungible(ticketTypeId, 4,{
      value: price * 4,
      from: accounts[0],
    });

    await event.makeSellOrderFungibles(ticketTypeId, 2, 100, {
      from:accounts[0]
    })
    await event.makeSellOrderFungibles(ticketTypeId, 1, 75, {
      from:accounts[0]
    })
    await event.makeSellOrderFungibles(ticketTypeId, 1, 50, {
      from:accounts[0]
    })
    await printQueues(event, ticketTypeId);
  });

  it("should buy 4 tickets for acc0 and post 3 for sale for 100% one for 75%", async () => {
    await event.mintFungible(ticketTypeId, 4,{
      value: price * 4,
      from: accounts[1],
    });

    await event.makeSellOrderFungibles(ticketTypeId, 3, 100, {
      from:accounts[1]
    })
    await event.makeSellOrderFungibles(ticketTypeId, 1, 75, {
      from:accounts[1]
    })
    await printQueues(event, ticketTypeId);
  });

  it("should remove acc0 from the buying queue 100% 1 ticket", async () => {
    event.withdrawSellOrderFungible(ticketTypeId, 1, 100, 0, {
      from:accounts[0]
    });
    await printQueues(event, ticketTypeId)

    event.withdrawSellOrderFungible(ticketTypeId, 1, 100, 0, {
      from:accounts[0]
    });

    await printQueues(event, ticketTypeId)
  });
})