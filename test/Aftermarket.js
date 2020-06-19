const {cidToArgs, argsToCid} = require("../utils/ipfs-parser")

const EventFungibleAftermarket = artifacts.require("EventFungibleAftermarket");

contract("Aftermarket", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 3;
  const maxTicketsPerPerson = 2;
  const isNF = false;
  const finalizationBlock = 1000;

  let event = null;

  before(async () => {
    const args = cidToArgs(cid);

    event = await EventFungibleAftermarket.new(
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
  });

  it("should return the event smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should buy 1 ticket for acc0", async () => {
    const numTickets = 1;
    const ticketType = 0;

    await event.mintFungible(ticketType, numTickets, {
      value: price,
      from: accounts[0],
    });

    var bigNumber = await event.tickets(ticketType, accounts[0]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned correctly"
    );
  });

  it("should add acc0 selling queue (Aftermarket contract)", async () => {
    const numTickets = 1;
    const ticketType = 0;

    await event.joinSellingQueue(ticketType, numTickets, {
      from: accounts[0],
    });

    var queue = await event.sellingQueue(ticketType);

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
  });

  it("should buy the ticket from the selling queue acc0 -> acc1 (Aftermarket contract)", async () => {
    const numTickets = 1;
    const ticketType = 0;

    await event.buyFungible(ticketType, numTickets, {
      value: price,
      from: accounts[1],
    });

    var bigNumber = await event.tickets(ticketType, accounts[1]);

    assert.equal(bigNumber.toNumber(), numTickets, "The ticket was not added.");

    var bigNumber = await event.tickets(ticketType, accounts[0]);

    assert.equal(bigNumber.toNumber(), 0, "The ticket was not sutracted.");

    var queue = await event.sellingQueue(ticketType);

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
  });

  it("should add acc0 to buying queue (Aftermarket contract)", async () => {
    const numTickets = 1;
    const ticketType = 0;

    await event.joinBuyingQueue(ticketType, numTickets, {
      value: price,
      from: accounts[0],
    });

    var queue = await event.buyingQueue(ticketType);

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
    const ticketType = 0;

    await event.sellFungible(ticketType, numTickets, {
      from: accounts[1],
    });

    var bigNumber = await event.tickets(ticketType, accounts[0]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned incorrectly"
    );

    var queue = await event.buyingQueue(ticketType);

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
});
