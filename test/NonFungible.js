const {cidToArgs, argsToCid} = require("../utils/ipfs-parser")

const EventNonFungible = artifacts.require("EventNonFungible");

contract("Fungible", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 5;
  const isNF = true;
  const finalizationBlock = 1000;
  let maxTicketsPerPerson = 0;

  let event = null;

  before(async () => {
    const args = cidToArgs(cid);

    event = await EventNonFungible.new(
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

  it("should mint 2 fungible tickets for acc0", async () => {
    const ticketType = 0;
    const ids = [0, 3];
    var assignedOwner;

    await event.mintNonFungibles(ticketType, ids, {
      value: price * ids.length,
      from: accounts[0],
    });

    assignedOwner = await event.nfTickets(ticketType, ids[0]);
    assert.equal(
      assignedOwner,
      accounts[0],
      "The ticket was assigned correctly"
    );

    assignedOwner = await event.nfTickets(ticketType, ids[1]);
    assert.equal(
      assignedOwner,
      accounts[0],
      "The ticket was assigned correctly"
    );

  });

  it("should not allow minting more tickets than allowed", async () => {
    const ids = [0,1,2,3,4];
    const ticketType = 0;

    try {
      await event.mintNonFungibles(ticketType, ids, {
        value: price * ids.length,
        from: accounts[1],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

  it("should not allow minting tickets with an id that does not exist", async () => {
    const unknownIds = [supply];
    const ticketType = 0;

    try {
      await event.mintNonFungibles(ticketType, unknownIds, {
        value: price * unknownIds.length,
        from: accounts[2],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

});
