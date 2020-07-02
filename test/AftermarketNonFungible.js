const {cidToArgs, argsToCid, nonFungibleBaseId} = require("idetix-utils");
const BigNumber = require('bignumber.js');

const EventNonFungibleAftermarket = artifacts.require("EventNonFungibleAftermarket");

contract("AftermarketNonFungible", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 10;
  const isNF = true;
  const finalizationBlock = 1000;

  let event = null;
  let maxTicketsPerPerson = 0;

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

    event = await EventNonFungibleAftermarket.new(
      accounts[0],
      args.hashFunction,
      args.size,
      args.digest
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
    maxTicketsPerPerson = await event.maxTicketsPerPerson();

  });

  it("should return the event smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should buy 2 tickets for acc0", async () => {
    const idsToBuy = [ids[0], ids[1]];

    await event.mintNonFungibles(idsToBuy, {
      value: price * idsToBuy.length,
      from: accounts[0],
    });

    var bigNumber1 = await event.tickets(idsToBuy[0], accounts[0]);
    var bigNumber2 = await event.tickets(idsToBuy[1], accounts[0]);
    var ownerAddress1 = await event.ownerOf(idsToBuy[0]);
    var ownerAddress2 = await event.ownerOf(idsToBuy[1]);

    assert.equal(
      bigNumber1.toNumber(),
      1,
      "The first tickets was not assigned correctly"
    );

    assert.equal(
      ownerAddress1,
      accounts[0],
      "The first ticket was not assigned correctly"
    );

    assert.equal(
      bigNumber2.toNumber(),
      1,
      "The second tickets was not assigned correctly"
    );

    assert.equal(
      ownerAddress2,
      accounts[0],
      "The second ticket was not assigned correctly"
    );
  });

  it("should add acc1 to the buying queue", async () => {
    const numTickets = 1;

    await event.joinBuyingQueue(nonFungibleBaseId, numTickets, {
      from: accounts[1],
      value: numTickets * price
    });

    var queue = await event.buyingQueue(nonFungibleBaseId);

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

  it("should sell ticket from acc0 to acc1", async () => {

    await event.sell([ids[0]], {
      from: accounts[0],
    });

    var ownerAddress = await event.ownerOf(ids[0]);
    assert.equal(
      ownerAddress,
      accounts[1],
      "The ticket was not transferred correctly"
    );
  });

  it("should post a non fungible ticket for sale", async () => {

    await event.joinNfSellingBatch([ids[1]], {
      from: accounts[0],
    });

    var sellerAddress = await event.nfTickets(ids[1]);
    assert.equal(
      sellerAddress,
      accounts[0],
      "The ticket was not posted correctly"
    );
  });

  it("should buy allow acc1 to buy the ticket that is for sale.", async () => {
    await event.buyNonFungibles([ids[1]], {
      from: accounts[1],
      value: price
    });

    var ownerAddress = await event.ownerOf(ids[1]);
    assert.equal(
      ownerAddress,
      accounts[1],
      "The ticket was not transferred correctly"
    );
  });

  it("should not allow to post a ticket for sale that one does not own", async () => {
    try {
      await event.joinNfSellingBatch([ids[0]], { from: accounts[0] });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

  it("should not allow to join a nf sale if people are in the buying queue", async () => {
    const idsToBuyAcc2 = [ids[2], ids[3]];
    const numTickets = 1;

    await event.mintNonFungibles(idsToBuyAcc2, {
      value: price * idsToBuyAcc2.length,
      from: accounts[2],
    });

    await event.joinBuyingQueue(nonFungibleBaseId, numTickets, {
      from: accounts[3],
      value: numTickets * price
    });

    try {
      await event.joinNfSellingBatch([ids[2]], { from: accounts[2] });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });
});
