const multihashes = require("multihashes");

const EventFactory = artifacts.require("EventFactory");
const Event = artifacts.require("Event");
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

contract("Event", () => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";

  let eventFactory = null;
  let event = null;
  let fungibleTicketFactory = null;

  before(async () => {
    eventFactory = await EventFactory.deployed();

    const args = cidToArgs(cid);

    await eventFactory.createEvent(args.hashFunction, args.size, args.digest);

    const eventAddress = await eventFactory.events(0);
    event = await Event.at(eventAddress);
  });

  it("should return the event factory smart contract", async () => {
    assert.notEqual(
      eventFactory.address !== "",
      "The event factory address is not set correctly."
    );
  });

  it("should return the event smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should add a ticket factory", async () => {
    const ticketPriceWei = 1000;
    const numTickets = 3;
    const ticketIpfsCid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
    const metadataArgs = cidToArgs(ticketIpfsCid);

    await event.addFungibleTicketFactory(
      metadataArgs.hashFunction,
      metadataArgs.size,
      metadataArgs.digest,
      ticketPriceWei,
      numTickets
    );

    const ticketFactoryAddress = await event.fungibleTicketFactories(0);

    assert.notEqual(
      event.address !== "",
      "The ticket factory address is not set correctly."
    );

    fungibleTicketFactory = await FungibleTicketFactory.at(
      ticketFactoryAddress
    );
  });
});
