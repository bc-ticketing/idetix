const multihashes = require("multihashes");

const FungibleTicketFactory = artifacts.require("FungibleTicketFactory");

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

contract("Event", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const numberTickets = 3;
  const ticketPriceWei = 1000;

  let fungibleTicketFactory = null;

  before(async () => {
    const args = cidToArgs(cid);
    fungibleTicketFactory = await FungibleTicketFactory.new(
      accounts[0],
      args.hashFunction,
      args.size,
      args.digest,
      numberTickets,
      ticketPriceWei
    );
  });

  it("should return the initially set ticket price", async () => {
    const setTicketPrice = await fungibleTicketFactory.ticketPriceWei.call();

    assert.equal(
      setTicketPrice.toNumber(),
      ticketPriceWei,
      "The ticket price was not set correctly."
    );
  });

  it("should return the initially set number of tickets", async () => {
    const setNumberOfTickets = await fungibleTicketFactory.numberTickets.call();

    assert.equal(
      setNumberOfTickets.toNumber(),
      numberTickets,
      "The number of tickets was not set correctly."
    );
  });

  it("should return the initially set IPFS CID.", async () => {
    const pastEvents = await fungibleTicketFactory.getPastEvents("IpfsCid", {
      fromBlock: 1,
    });
    const latestEvent = pastEvents[pastEvents.length - 1].returnValues;

    const loadedCid = argsToCid(
      latestEvent["hashFunction"],
      latestEvent["size"],
      latestEvent["digest"]
    );

    assert.equal(loadedCid, cid, "The IPFS CID was not updated correctly.");
  });

  it("should assign a ticket to account[0]", async () => {
    await fungibleTicketFactory.buyFungibleTicket({
      value: ticketPriceWei,
      from: accounts[0],
    });

    assert.equal(
      await fungibleTicketFactory.hasTicket(accounts[0]),
      true,
      "The owner of the ticket was not set correctly."
    );
  });

  it("should assign a ticket to account[1]", async () => {
    await fungibleTicketFactory.buyFungibleTicket({
      value: ticketPriceWei,
      from: accounts[1],
    });

    assert.equal(
      await fungibleTicketFactory.hasTicket(accounts[1]),
      true,
      "The owner of the ticket was not set correctly."
    );
  });

  it("should assign a ticket to account[2]", async () => {
    await fungibleTicketFactory.buyFungibleTicket({
      value: ticketPriceWei,
      from: accounts[2],
    });

    assert.equal(
      await fungibleTicketFactory.hasTicket(accounts[2]),
      true,
      "The owner of the ticket was not set correctly."
    );
  });

  it("should add the buyer to the buying queue account[3]", async () => {
    await fungibleTicketFactory.buyFungibleTicket({
      value: ticketPriceWei,
      from: accounts[3],
    });

    const buyingQueueHead = await fungibleTicketFactory.buyingQueueHead();
    const address = await fungibleTicketFactory.buyingQueue(buyingQueueHead);

    assert.equal(
      address,
      accounts[3],
      "The owner of the ticket was not added to the buying queue."
    );
  });

  it("should sell the ticket to account[3]", async () => {
    const account = accounts[0];
    const ticketId = await fungibleTicketFactory.getTicketId({
      from: account,
    });
    await fungibleTicketFactory.sellFungibleTicket(ticketId.toNumber(), {
      from: account,
    });

    assert.equal(
      await fungibleTicketFactory.hasTicket(accounts[3]),
      true,
      "The ownership of the ticket was not transferred correctly. Buyer has not received the ticket."
    );

    assert.equal(
      await fungibleTicketFactory.hasTicket(accounts[0]),
      false,
      "The ownership of the ticket was not transferred correctly. Seller still owns the ticket."
    );
  });

  it("should add the seller to the selling queue account[1]", async () => {
    const account = accounts[1];
    const ticketId = await fungibleTicketFactory.getTicketId({
      from: account,
    });
    await fungibleTicketFactory.sellFungibleTicket(ticketId.toNumber(), {
      from: account,
    });

    const sellingQueueHead = await fungibleTicketFactory.sellingQueueHead();

    const ticket = await fungibleTicketFactory.sellingQueue(sellingQueueHead);
    assert.equal(
      ticket["ticketOwner"],
      account,
      "The ownership of the ticket was not transferred correctly."
    );
  });

  it("should assign a ticket to account[4]", async () => {
    await fungibleTicketFactory.buyFungibleTicket({
      value: ticketPriceWei,
      from: accounts[4],
    });

    assert.equal(
      await fungibleTicketFactory.hasTicket(accounts[1]),
      false,
      "The ownership of the ticket was not transferred correctly. Seller still has the ticket."
    );

    assert.equal(
      await fungibleTicketFactory.hasTicket(accounts[4]),
      true,
      "The ownership of the ticket was not transferred correctly. Buyer did not receive the ticket."
    );
  });
});
