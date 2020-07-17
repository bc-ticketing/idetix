const {cidToArgs, argsToCid, nonFungibleBaseId, printQueues} = require("idetix-utils");

const EventMintableAftermarket = artifacts.require("EventMintableAftermarket");

contract("AftermarketNonFungibleDynamicBuying", (accounts) => {
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