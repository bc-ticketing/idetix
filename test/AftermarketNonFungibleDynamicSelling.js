const {cidToArgs, argsToCid, nonFungibleBaseId, printNfSellOrders, getNfId, prettyPrintAddress} = require("idetix-utils");
const BigNumber = require("bignumber.js");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("AftermarketNonFungibleDynamicSelling", (accounts) => {
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

  it("should buy tickets for acc0 and create sell orders", async () => {
    const idsToBuy = ids.slice(0,4);

    await event.mintNonFungibles(idsToBuy, {
      value: price * idsToBuy.length,
      from: accounts[0],
    });

    await event.makeSellOrderNonFungibles(idsToBuy, [100, 100, 100, 75], {
      from: accounts[0]
    });
  });

  it("should buy tickets for acc1 and create sell orders", async () => {
    const idsToBuy = ids.slice(4, 8);

    await event.mintNonFungibles(idsToBuy, {
      value: price * idsToBuy.length,
      from: accounts[1],
    });

    await event.makeSellOrderNonFungibles(idsToBuy, [50, 100, 25, 75], {
      from: accounts[1]
    });

    await printNfSellOrders(event, nonFungibleBaseId)
  });

  it("should buy withdraw a sell order", async () => {
    await event.withdrawSellOrderNonFungible(ids[6], {
      from: accounts[1],
    });
    await printNfSellOrders(event, nonFungibleBaseId)
  });

});