const {cidToArgs, argsToCid} = require("idetix-utils")

const EventFactory = artifacts.require("EventFactory");
const Event = artifacts.require("Event");

contract("EventFactory", () => {
  let eventFactory = null;
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const cid2 = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs82";

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
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest);
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest);
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest);

    const events = await eventFactory.getEvents();
    assert.equal(
      events.length,
      3,
      "The number of events added does not match."
    );
  });
});
