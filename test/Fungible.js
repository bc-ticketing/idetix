const {cidToArgs, argsToCid} = require("../utils/ipfs-parser")

const EventFungible = artifacts.require("EventFungible");

contract("Fungible", (accounts) => {
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

    event = await EventFungible.new(
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
    await event.createType(
      args.hashFunction,
      args.size,
      args.digest,
      isNF,
      price,
      finalizationBlock,
      supply
    );

    let ticketType = await event.ticketTypeMeta(0);

    assert.equal(
      ticketType["price"].toNumber(),
      price,
      "The ticket price is not set correctly."
    );

    assert.equal(
      ticketType["supply"].toNumber(),
      supply,
      "The supply is not set correctly."
    );

    assert.equal(ticketType["isNF"], isNF, "The isNF is not set correctly.");

    assert.equal(
      ticketType["finalizationBlock"],
      finalizationBlock,
      "The finalization block is not set correctly."
    );
  });

  it("should mint 1 ticket for acc0", async () => {
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
});
