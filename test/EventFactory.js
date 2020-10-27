const {cidToArgs, argsToCid} = require("idetix-utils")

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");
const BigNumber = require("bignumber.js");

contract("EventFactory", (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[2];
  const eventGuests = accounts.slice(3);

  let eventFactory = null;
  let identity = null;
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const cid2 = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs82";
  const identityContract = Identity.address;
  const identityLevel = 0;
  const zeroAddress = "0x0000000000000000000000000000000000000000"; // which is used as a default function paramter for ETH payments and no identity approver
  const granularity = 4;
  const args = cidToArgs(cid);

  before(async () => {
    // create new identity contract
    identity = await Identity.new();

    // register identity approver
    await identity.registerApprover(args.hashFunction, args.size, args.digest, {from: identityApprover});

    // create a new event factory contract
    eventFactory = await EventFactory.new(identity.address);
  });

  it("should deploy the EventFactory smart contract", async () => {
    assert.notEqual(
      eventFactory.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should return an array of events", async () => {
    const args = cidToArgs(cid);
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, zeroAddress, granularity, {from: eventHost});
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, zeroAddress, granularity, {from: eventHost});
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, zeroAddress, granularity, {from: eventHost});

    const events = await eventFactory.getEvents();
    assert.equal(
      events.length,
      3,
      "The number of events added does not match."
    );
  });

  it("should allow to create an event with no identity approver", async () => {
    const args = cidToArgs(cid);
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, zeroAddress, identityLevel, zeroAddress, granularity, {from: eventHost});

    const events = await eventFactory.getEvents();
    assert.equal(
      events.length,
      4,
      "The number of events added does not match."
    );
  });

  it("should not allow to create an event if the identity prover is not yet registered", async () => {
    try {
      const args = cidToArgs(cid);
      await eventFactory.createEvent(args.hashFunction, args.size, args.digest, eventGuests[0], identityLevel, zeroAddress, granularity, {from: eventHost});
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });
});
