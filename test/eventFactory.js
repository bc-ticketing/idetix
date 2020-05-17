const bs58 = require("bs58");
const multihashes = require("multihashes");

// Check out the link for IPFS hash conversion:
// https://ipfs-sec.stackexchange.cloudflare-ipfs.com/ethereum/A/question/17094.html

const EventFactory = artifacts.require("EventFactory");
const Event = artifacts.require("Event");

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

  it("should return the initially stored IPFS CID", async () => {
    const eventAddress = await eventFactory.events(0);
    const event = await Event.at(eventAddress);
    const args1 = cidToArgs(cid2);

    const tx1 = await event.updateIpfsCid(
      args1.hashFunction,
      args1.size,
      args1.digest
    );

    const args2 = cidToArgs(cid);

    const tx2 = await event.updateIpfsCid(
      args2.hashFunction,
      args2.size,
      args2.digest
    );

    // https://web3js.readthedocs.io/en/v1.2.0/web3-eth-contract.html#getpastevents
    const pastEvents = await event.getPastEvents("IpfsCid", { fromBlock: 1 });
    const latestEvent = pastEvents[pastEvents.length - 1].returnValues;

    const loadedCid = argsToCid(
      latestEvent["hashFunction"],
      latestEvent["size"],
      latestEvent["digest"]
    );

    assert.equal(loadedCid, cid, "The IPFS CID was not updated correctly.");

    // const calledMetadataMultihash = await event.metadataMultihash.call();

    // const calledBytes = calledMetadataMultihash.hashBytes;
    // const calledHashFunction = calledMetadataMultihash.hashFunction.toNumber();
    // const calledSize = calledMetadataMultihash.hashSize.toNumber();

    // const loadedIPFSHash = getIpfsHashFromBytes32(
    //   calledBytes,
    //   calledHashFunction,
    //   calledSize
    // );
    // assert.equal(
    //   loadedIPFSHash,
    //   ipfsHash,
    //   "The IPFS hash was not loaded correctly."
    // );
  });
});
