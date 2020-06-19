const multihashes = require("multihashes");

const EventFungibleAftermarket = artifacts.require("EventFungibleAftermarket");

// util function to decode IPFS CID
const cidToArgs = (cid) => {
  const mh = multihashes.fromB58String(Buffer.from(cid));
  return {
    hashFunction: "0x" + mh.slice(0, 1).toString("hex"),
    size: "0x" + mh.slice(1, 2).toString("hex"),
    digest: "0x" + mh.slice(2).toString("hex"),
  };
};

// util function to recover IPFS CID
const argsToCid = (hashFunction, size, digest) => {
  const hashHex = hashFunction.slice(2) + size.slice(2) + digest.slice(2);
  const hashBytes = Buffer.from(hashHex, "hex");
  return multihashes.toB58String(hashBytes);
};

contract("EventFungibleAftermarket", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const ethCurrencyAddress = "0x0000000000000000000000000000000000000000";
  const affiliateCommisson = 10;
  const ticketPrice = 1000;

  let event = null;
  let fungibleTicketFactory = null;

  before(async () => {
    const args = cidToArgs(cid);

    event = await EventFungibleAftermarket.new(
      accounts[0],
      args.hashFunction,
      args.size,
      args.digest
    );
  });

  it("should return the event smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should create a fungible ticket type", async () => {
    const ticketPrice = 1000;
    const numberTickets = 3;
    const maxTicketsPerPerson = 4;
    const isNF = false;
    const finalizationBlockNr = 100;
    const ticketIpfsCid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
    const metadataArgs = cidToArgs(ticketIpfsCid);

    await event.createType(
      metadataArgs.hashFunction,
      metadataArgs.size,
      metadataArgs.digest,
      isNF,
      ticketPrice,
      finalizationBlockNr,
      numberTickets
    );

    let ticketType = await event.ticketTypeMeta(0);

    assert.equal(
      ticketType["price"].toNumber(),
      ticketPrice,
      "The ticket price is not set correctly."
    );

    assert.equal(
      ticketType["supply"].toNumber(),
      numberTickets,
      "The supply is not set correctly."
    );

    assert.equal(ticketType["isNFT"], isNF, "The isNFT is not set correctly.");

    assert.equal(
      ticketType["finalizationBlock"],
      finalizationBlockNr,
      "The finalization block is not set correctly."
    );
  });

  it("should buy a ticket for acc0 (Fungible contract)", async () => {
    const numTickets = 1;
    const ticketType = 0;

    await event.mintFungible(ticketType, numTickets, {
      value: ticketPrice,
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
      value: ticketPrice,
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
      value: ticketPrice,
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

    // var bigNumber = await event.tickets(ticketType, accounts[0]);

    // assert.equal(
    //   bigNumber.toNumber(),
    //   numTickets,
    //   "The ticket was assigned incorrectly"
    // );

    // var queue = await event.buyingQueue(ticketType);

    // assert.equal(
    //   queue["tail"].toNumber(),
    //   1,
    //   "The tail of the buying queue was set incorrectly"
    // );

    // assert.equal(
    //   queue["head"].toNumber(),
    //   1,
    //   "The head of the buying queue was set incorrectly"
    // );
  });
});
