const {cidToArgs, argsToCid, nonFungibleBaseId, printQueues} = require("idetix-utils");

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
  const erc20Contract = "0x1Fe2b9481B57442Ea4147A0E0A5cF22245E3546E";

  let eventFactory = null;
  let event = null;

  const ids = [
    nonFungibleBaseId.plus(1, 10),
    nonFungibleBaseId.plus(2, 10),
    nonFungibleBaseId.plus(3, 10),
    nonFungibleBaseId.plus(4, 10),
    nonFungibleBaseId.plus(5, 10),
    nonFungibleBaseId.plus(6, 10),
    nonFungibleBaseId.plus(7, 10),
    nonFungibleBaseId.plus(8, 10),
    nonFungibleBaseId.plus(9, 10),
    nonFungibleBaseId.plus(10, 10)
  ];

  before(async () => {
    // parse ipfs hash
    const args = cidToArgs(cid);

    // retrieve event factory contract
    eventFactory = await EventFactory.deployed();

    // create a new event
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

    // read the default value set for max tickets per person
    maxTicketsPerPerson = await event.maxTicketsPerPerson();
  });

  it("should return the event smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });


  it("should fill buying queues", async () => {
    await event.makeBuyOrder(nonFungibleBaseId, 1, 100, {
      from: accounts[1],
      value: 1 * price
    });

    await event.makeBuyOrder(nonFungibleBaseId, 1, 100, {
      from: accounts[2],
      value: 1 * price
    });

    await event.makeBuyOrder(nonFungibleBaseId, 2, 75, {
      from: accounts[3],
      value: 2 * price
    });

    await event.makeBuyOrder(nonFungibleBaseId, 4, 100, {
      from: accounts[4],
      value: 4 * price
    });

    await event.makeBuyOrder(nonFungibleBaseId, 3, 25, {
      from: accounts[5],
      value: 3 * price
    });

    await event.makeBuyOrder(nonFungibleBaseId, 1, 100, {
      from: accounts[5],
      value: 1 * price
    });

    await event.makeBuyOrder(nonFungibleBaseId, 1, 100, {
      from: accounts[5],
      value: 1 * price
    });
    await printQueues(event, nonFungibleBaseId);
  });

  it("should remove acc4 from the queue", async () => {
    await event.withdrawBuyOrder(nonFungibleBaseId, 3, 100, 2, {
      from: accounts[4],
    });
    await printQueues(event, nonFungibleBaseId);
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

    await printQueues(event, nonFungibleBaseId);
  });
})