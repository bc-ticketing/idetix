const {cidToArgs, argsToCid, nonFungibleBaseId, fungibleBaseId} = require("idetix-utils")

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("EventFactory", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const cid2 = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs82";
  const identityApprover = "0xB18D4a541216438D4480fBA37129e82a4ee49E88";
  const identityLevel = 1;
  const erc20Contract = "0x1Fe2b9481B57442Ea4147A0E0A5cF22245E3546E";
  const isNF = false;
  const granularity = 1;
  const finalizationBlock = 1000;
  const price = 1000;
  const supply = 5;
  let eventFactory = null;
  let event = null;
  let maxTicketsPerPerson = 0;

  before(async () => {
    // parse ipfs hash
    const args = cidToArgs(cid);

    // retrieve event factory contract
    eventFactory = await EventFactory.deployed();

    // create a new event
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20Contract, granularity);

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEvents = await eventFactory.getPastEvents("EventCreated", { fromBlock: 1 });
    const eventContractAddress = pastSolidityEvents[pastSolidityEvents.length - 1].returnValues["_contractAddress"];

    // create new instance of the Event Contract
    event = await EventMintableAftermarketPresale.at(eventContractAddress);

    // create a new ticket type
    await event.createType(
      args.hashFunction,
      args.size,
      args.digest,
      isNF,
      price,
      finalizationBlock,
      supply
    );

    // read the default value set for max tickets per person
    maxTicketsPerPerson = await event.maxTicketsPerPerson();
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
      args2.digest,
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

  it("should return the initially set values", async () => {
    assert.equal(
      await event.identityApprover(),
      identityApprover,
      "identityApprover is not set correctly"
    );

    assert.equal(
      await event.identityLevel(),
      identityLevel,
      "identity level is not set correctly"
    );
  });
});
