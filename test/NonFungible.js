const {cidToArgs, argsToCid} = require("idetix-utils");
const BigNumber = require("bignumber.js");
const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("NonFungible", (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[2];
  const eventGuests = accounts.slice(3);

  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = new BigNumber("1000000000000000", 10);
  const price2 = new BigNumber("2000000000000000", 10);
  const supply = 10;
  const isNF = true;
  const finalizationTime = parseInt(Date.now()/1000) + 120; //two minutes in the future
  const identityContract = Identity.address;
  const identityLevel = 0;
  const erc20Contract = "0x0000000000000000000000000000000000000000";
  const granularity = 1;
  let ticketTypeId = null;
  let ticketTypeId2 = null;
  let identity = null;
  let eventFactory = null;
  let event = null;
  let maxTicketsPerPerson = 0;

  let ids = null;

  const nonExistingIds = [
    "57896044618658097711785492504343953926975274699741220483192166611388333031423"
  ];


  before(async () => {
    // parse ipfs hash
    const args = cidToArgs(cid);

    // create new identity contract
    identity = await Identity.new();

    // register identity approver
    await identity.registerApprover(args.hashFunction, args.size, args.digest, {from: identityApprover});

    // create a new event factory contract
    eventFactory = await EventFactory.new(identity.address);

    // create a new event contract
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20Contract, granularity, {from: eventHost});

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEvents = await eventFactory.getPastEvents("EventCreated", { fromBlock: 1 });
    const eventContractAddress = pastSolidityEvents[pastSolidityEvents.length - 1].returnValues["_contractAddress"];

    // create new instance of the Event Contract
    event = await EventMintableAftermarketPresale.at(eventContractAddress);

    // create a new ticket type
    await event.createTypes(
      [args.hashFunction, args.hashFunction],
      [args.size, args.size],
      [args.digest, args.digest],
      [isNF, isNF],
      [price.toFixed(), price2.toFixed()],
      [finalizationTime, finalizationTime],
      [supply, supply],
      {from: eventHost}
    );

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEventsTicketType = await event.getPastEvents("TicketMetadata", { fromBlock: 1 });
    ticketTypeId = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 2].returnValues["ticketTypeId"];
    ticketTypeId2 = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["ticketTypeId"];

    // read the default value set for max tickets per person
    maxTicketsPerPerson = await event.maxTicketsPerPerson();

    ids = [
      new BigNumber(ticketTypeId).plus(1, 10),
      new BigNumber(ticketTypeId).plus(2, 10),
      new BigNumber(ticketTypeId).plus(3, 10),
      new BigNumber(ticketTypeId).plus(4, 10),
      new BigNumber(ticketTypeId).plus(5, 10),
      new BigNumber(ticketTypeId).plus(6, 10),
      new BigNumber(ticketTypeId).plus(7, 10),
      new BigNumber(ticketTypeId).plus(8, 10),
      new BigNumber(ticketTypeId).plus(9, 10),
      new BigNumber(ticketTypeId).plus(10, 10)
    ]
    ids2 = [
      new BigNumber(ticketTypeId2).plus(1, 10),
      new BigNumber(ticketTypeId2).plus(2, 10),
      new BigNumber(ticketTypeId2).plus(3, 10),
      new BigNumber(ticketTypeId2).plus(4, 10),
      new BigNumber(ticketTypeId2).plus(5, 10),
      new BigNumber(ticketTypeId2).plus(6, 10),
      new BigNumber(ticketTypeId2).plus(7, 10),
      new BigNumber(ticketTypeId2).plus(8, 10),
      new BigNumber(ticketTypeId2).plus(9, 10),
      new BigNumber(ticketTypeId2).plus(10, 10)
    ]
  });


  it("should return the event smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should create a fungible ticket type", async () => {
    await event.createTypes(
      [args.hashFunction],
      [args.size],
      [args.digest],
      [isNF],
      [price.toFixed()],
      [finalizationTime],
      [supply],
      {from: eventHost}
    );

    let ticketType = await event.ticketTypeMeta(ticketTypeId);
    // console.log(nonticketTypeId)

    assert.equal(
      new BigNumber(ticketType["price"]).toFixed(),
      price.toFixed(),
      "The ticket price is not set correctly."
    );

    assert.equal(
      ticketType["supply"].toNumber(),
      supply,
      "The supply is not set correctly."
    );

    assert.equal(
      ticketType["finalizationTime"],
      finalizationTime,
      "The finalization block is not set correctly."
    );
  });

  it("should mint 2 fungible tickets for acc0", async () => {
    const idsToBuy = [ids[0], ids[1]];
    var assignedOwner;

    await event.mintNonFungibles(idsToBuy, [affiliate], {
      value: price.multipliedBy(idsToBuy.length).toFixed(),
      from: eventGuests[0],
    });


    assignedOwner = await event.nfOwners(idsToBuy[0]);
    assert.equal(
      assignedOwner,
      eventGuests[0],
      "The ticket was assigned correctly"
    );

    assignedOwner = await event.nfOwners(idsToBuy[1]);
    assert.equal(
      assignedOwner,
      eventGuests[0],
      "The ticket was assigned correctly"
    );

  });

  it("should not allow acc1 minting more tickets than allowed", async () => {
    const idsToBuy = [ids[2], ids[3], ids[4], ids[5], ids[6]];

    try {
      await event.mintNonFungibles(idsToBuy, [affiliate], {
        value: price.multipliedBy(idsToBuy.length).toFixed(),
        from: eventGuests[1],
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
      await event.mintNonFungibles(unknownIds, [affiliate], {
        value: price.multipliedBy(unknownIds.length).toFixed(),
        from: eventGuests[2],
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
      await event.mintNonFungibles(idsToBuy, [affiliate], {
        value: (price.multipliedBy(idsToBuy.length)).minus( 1),
        from: eventGuests[3],
      });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

  it("should mint tickets from two different types", async () => {
    const idsToBuy = [ids2[0], ids[9]];

    const totalPrice = price.plus(price2).toFixed();

    await event.mintNonFungibles(idsToBuy, [affiliate], {
      value: totalPrice,
      from: eventGuests[4],
    });

    const assignedOwner1 = await event.nfOwners(ids2[0]);
    assert.equal(
      assignedOwner1,
      eventGuests[4],
      "The ticket was assigned correctly"
    );

    const assignedOwner2 = await event.nfOwners(ids[9]);
    assert.equal(
      assignedOwner2,
      eventGuests[4],
      "The ticket was assigned correctly"
    );
  });
});
