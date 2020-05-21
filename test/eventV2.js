const multihashes = require("multihashes");

const EventFactory = artifacts.require("EventFactory");
const EventV2 = artifacts.require("EventV2");
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

contract("EventV2", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const ethCurrencyAddress = "0x0000000000000000000000000000000000000000";
  const affiliateCommisson = 10;
  const ticketPrice = 1000;

  let eventFactory = null;
  let event = null;
  let fungibleTicketFactory = null;

  before(async () => {
    const args = cidToArgs(cid);

    event = await EventV2.new(
      accounts[0],
      args.hashFunction,
      args.size,
      args.digest,
      ethCurrencyAddress,
      affiliateCommisson
    );
  });

  it("should return the event smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should add a ticket factory", async () => {
    const ticketPrice = 1000;
    const numberTickets = 3;
    const maxTicketsPerPerson = 4;
    const ticketIpfsCid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
    const metadataArgs = cidToArgs(ticketIpfsCid);

    await event.addFungibleTicketFactory(
      metadataArgs.hashFunction,
      metadataArgs.size,
      metadataArgs.digest,
      ticketPrice,
      numberTickets,
      maxTicketsPerPerson
    );

    let ticketFactory = await event.fungibleTicketFactories(0);

    assert.equal(
      ticketFactory["ticketPrice"].toNumber(),
      ticketPrice,
      "The ticket price is not set correctly."
    );

    assert.equal(
      ticketFactory["numberTickets"].toNumber(),
      numberTickets,
      "The ticket price is not set correctly."
    );

    assert.equal(
      ticketFactory["maxTicketsPerPerson"].toNumber(),
      maxTicketsPerPerson,
      "The ticket price is not set correctly."
    );
  });

  it("should buy a ticket", async () => {
    const ticketFactoryId = 0;
    const numTickets = 1;
    await event.buyFungibleTickets(ticketFactoryId, numTickets, [accounts[1]], {
      value: ticketPrice,
      from: accounts[0],
    });

    var bigNumber = await event.getNumTickets(ticketFactoryId, accounts[0]);

    assert.equal(bigNumber.toNumber(), 1, "The ticket was assigned correctly");
  });
});
