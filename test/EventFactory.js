const {cidToArgs, argsToCid} = require("idetix-utils")

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("EventFactory", () => {
  let eventFactory = null;
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const cid2 = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs82";
  const identityContract = Identity.address;
  const identityApprover = "0xB18D4a541216438D4480fBA37129e82a4ee49E88";
  const identityLevel = 0;
  const erc20Contract = "0x0000000000000000000000000000000000000000";
  const granularity = 4;

  before(async () => {
    eventFactory = await EventFactory.deployed();
  });

  it("should deploy the EventFactory smart contract", async () => {
    assert.notEqual(
      eventFactory.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should return an array of events", async () => {
    const args = cidToArgs(cid);
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20Contract, granularity);
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20Contract, granularity);
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20Contract, granularity);

    const events = await eventFactory.getEvents();
    assert.equal(
      events.length,
      3,
      "The number of events added does not match."
    );
  });
});
