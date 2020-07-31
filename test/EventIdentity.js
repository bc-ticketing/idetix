const {cidToArgs, argsToCid, fungibleBaseId} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("EventIdentity", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 5;
  const isNF = false;
  const finalizationBlock = 1000;
  const identityApprover = accounts[0];
  const identityLevel = 3;
  const erc20Contract = "0x1Fe2b9481B57442Ea4147A0E0A5cF22245E3546E";
  const granularity = 1;
  let eventFactory = null;
  let event = null;
  let identity = null;
  let maxTicketsPerPerson = 0;
  let identityContract = null;


  before(async () => {
    // create a new identity contract (better to create a new one for testing purposes)
    identity = await Identity.deployed();

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

    let ticketType = await event.ticketTypeMeta(fungibleBaseId);
  });

  it("should register acc0 as approver and acc1 as verified with level 3", async () => {
    await identity.registerApprover(args.size, args.hashFunction, args.digest, {from: accounts[0]});
    await identity.approveIdentity(accounts[1], identityLevel, {from: accounts[0]});

    console.log(await identity.getSecurityLevel(accounts[0], accounts[1]));
    // assert.equal(
    //   bigNumber.toNumber(),
    //   numTickets,
    //   "The ticket was assigned correctly"
    // );
  });

  it("should mint 1 ticket for acc1", async () => {
    const numTickets = 1;

    await event.mintFungible(fungibleBaseId, numTickets, {
      value: price,
      from: accounts[1],
    });

    var bigNumber = await event.tickets(fungibleBaseId, accounts[1]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned correctly"
    );
  });

  it("should not allow acc2 to mint a ticket since not verified", async () => {
    const numTickets = 1;

    try {
      await event.mintFungible(fungibleBaseId, numTickets, {
        value: price,
        from: accounts[2],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });
});
