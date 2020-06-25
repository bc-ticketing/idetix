const {cidToArgs, argsToCid} = require("../utils/ipfs-parser");
const BigNumber = require('bignumber.js');

const EventFungible = artifacts.require("EventFungible");

contract("Fungible", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 5;
  const isNF = false;
  const finalizationBlock = 1000;

  // must be a string, since JS cannot deal with such large integers
  // number is is equivalent to 1(128*0)
  const ticketTypeId = new BigNumber("340282366920938463463374607431768211456");
  let maxTicketsPerPerson = 0;

  let event = null;

  before(async () => {
    const args = cidToArgs(cid);

    event = await EventFungible.new(
      accounts[0],
      args.hashFunction,
      args.size,
      args.digest
    );
    maxTicketsPerPerson = await event.maxTicketsPerPerson();
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

    let ticketType = await event.ticketTypeMeta(ticketTypeId);

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

    assert.equal(
      ticketType["finalizationBlock"],
      finalizationBlock,
      "The finalization block is not set correctly."
    );
  });

  it("should mint 1 ticket for acc0", async () => {
    const numTickets = 1;

    await event.mintFungible(ticketTypeId, numTickets, {
      value: price,
      from: accounts[0],
    });

    var bigNumber = await event.tickets(ticketTypeId, accounts[0]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned correctly"
    );
  });

  it("should not allow minting more tickets than allowed", async () => {
    const numTickets = maxTicketsPerPerson + 1;

    try {
      await event.mintFungible(ticketTypeId, numTickets, {
        value: price * numTickets,
        from: accounts[1],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });
});
