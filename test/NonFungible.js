const {cidToArgs, argsToCid} = require("../utils/ipfs-parser");
const BigNumber = require('bignumber.js');

const EventNonFungible = artifacts.require("EventNonFungible");

contract("NonFungible", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 10;
  const isNF = true;
  const finalizationBlock = 1000;


  // which is equivalent in binary to 1(126*0)1(128*0)
  const ticketTypeId = new BigNumber("57896044618658097711785492504343953926975274699741220483192166611388333031424");
  const ids = [
    "57896044618658097711785492504343953926975274699741220483192166611388333031425",
    "57896044618658097711785492504343953926975274699741220483192166611388333031426",
    "57896044618658097711785492504343953926975274699741220483192166611388333031427",
    "57896044618658097711785492504343953926975274699741220483192166611388333031428",
    "57896044618658097711785492504343953926975274699741220483192166611388333031429",
    "57896044618658097711785492504343953926975274699741220483192166611388333031430",
    "57896044618658097711785492504343953926975274699741220483192166611388333031431",
    "57896044618658097711785492504343953926975274699741220483192166611388333031432",
    "57896044618658097711785492504343953926975274699741220483192166611388333031433",
    "57896044618658097711785492504343953926975274699741220483192166611388333031434",
  ];

  const nonExistingIds = [
    "57896044618658097711785492504343953926975274699741220483192166611388333031423"
  ]

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
    maxTicketsPerPerson = await event.maxTicketsPerPerson(); // default 2
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
    // console.log(ticketTypeId)

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

  it("should mint 2 fungible tickets for acc0", async () => {
    const idsToBuy = [ids[0], ids[1]];
    var assignedOwner;

    await event.mintNonFungibles(idsToBuy, {
      value: price * idsToBuy.length,
      from: accounts[0],
    });


    assignedOwner = await event.nfOwners(idsToBuy[0]);
    assert.equal(
      assignedOwner,
      accounts[0],
      "The ticket was assigned correctly"
    );

    assignedOwner = await event.nfOwners(idsToBuy[1]);
    assert.equal(
      assignedOwner,
      accounts[0],
      "The ticket was assigned correctly"
    );

  });

  it("should not allow acc1 minting more tickets than allowed", async () => {
    const idsToBuy = [ids[2], ids[3], ids[4]];

    try {
      await event.mintNonFungibles(idsToBuy, {
        value: price * idsToBuy.length,
        from: accounts[1],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

  it("should not allow acc2 minting tickets with an id that does not exist", async () => {
    const unknownIds = [nonExistingIds[0]];

    try {
      await event.mintNonFungibles(unknownIds, {
        value: price * unknownIds.length,
        from: accounts[2],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

  it("should not allow acc3 minting tickets with the wrong value", async () => {
    const idsToBuy = [ids[7], ids[8]];

    try {
      await event.mintNonFungibles(idsToBuy, {
        value: price * idsToBuy.length -1 ,
        from: accounts[3],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

});
