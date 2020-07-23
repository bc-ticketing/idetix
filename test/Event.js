const {cidToArgs, argsToCid, nonFungibleBaseId, fungibleBaseId} = require("idetix-utils")

const Event = artifacts.require("Event");

contract("EventFactory", (accounts) => {
  let event = null;
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const cid2 = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs82";

  before(async () => {
    const args = cidToArgs(cid);
    event = await Event.new(
      accounts[0],
      args.hashFunction,
      args.size,
      args.digest
    );
  });

  it("should deploy the EventFactory smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should return the updated IPFS CID", async () => {
    const args2 = cidToArgs(cid2);
    const tx = await event.updateEventMetadata(
      args2.hashFunction,
      args2.size,
      args2.digest
    );

    // https://web3js.readthedocs.io/en/v1.2.0/web3-eth-contract.html#getpastevents
    const pastEvents = await event.getPastEvents("EventMetadata", { fromBlock: 1 });
    const latestEvent = pastEvents[pastEvents.length - 1].returnValues;

    const loadedCid = argsToCid(
      latestEvent["hashFunction"],
      latestEvent["size"],
      latestEvent["digest"]
    );

    assert.equal(loadedCid, cid2, "The IPFS CID was not updated correctly.");
  });

  it("should differentiate between types and ids", async () => {
    assert.equal(
      await event.isType(fungibleBaseId),
      true,
      "fungible base type id is not recognized correctly"
    );

    assert.equal(
      await event.isType(nonFungibleBaseId),
      true,
      "non-fungible base type id is not recognized correctly"
    );

    assert.equal(
      await event.isType(nonFungibleBaseId.plus(1, 10)),
      false,
      "non-fungible ticket id is not recognized correctly"
    );

    assert.equal(
      await event.isType(fungibleBaseId.plus(1, 10)),
      false,
      "non-fungible ticket id is not recognized correctly"
    );
  });
});
