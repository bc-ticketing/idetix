const {cidToArgs, argsToCid, nonFungibleBaseId, printNfSellOrders, getNfId, prettyPrintAddress} = require("idetix-utils");
const BigNumber = require("bignumber.js");

const EventMintableAftermarket = artifacts.require("EventMintableAftermarket");

contract("AftermarketNonFungibleDynamicSelling", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 10;
  const isNF = true;
  const finalizationBlock = 1000;
  const granularity = 4;

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
    const args = cidToArgs(cid);

    event = await EventMintableAftermarket.new(
      accounts[0],
      args.hashFunction,
      args.size,
      args.digest,
      granularity
    );

    await event.createType(
      args.hashFunction,
      args.size,
      args.digest,
      isNF,
      price,
      finalizationBlock,
      supply
    );
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