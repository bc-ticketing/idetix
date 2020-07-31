const {cidToArgs, argsToCid, printQueues} = require("idetix-utils");
const BigNumber = require("bignumber.js");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("AftermarketNonFungible", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 10;
  const isNF = true;
  const finalizationBlock = 1000;
  const queuePercentage = 100;
  const granularity = 4;
  const identityContract = Identity.address;
  const identityApprover = "0xB18D4a541216438D4480fBA37129e82a4ee49E88";
  const identityLevel = 0;
  const erc20Contract = "0x1Fe2b9481B57442Ea4147A0E0A5cF22245E3546E";

  let eventFactory = null;
  let event = null;
  let maxTicketsPerPerson = 0;
  let identity = null;
  let ticketTypeId = null;
  let ids = null;

  before(async () => {
    // parse ipfs hash
    const args = cidToArgs(cid);

    // create new identity contract
    identity = await Identity.new();

    // create a new event factory contract
    eventFactory = await EventFactory.new(identity.address);

    // create a new event contract
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

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEventsTicketType = await event.getPastEvents("TicketMetadata", { fromBlock: 1 });
    ticketTypeId = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["ticketTypeId"];

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
  });

  it("should buy 2 tickets for acc0", async () => {
    const idsToBuy = [ids[0], ids[1]];

    await event.mintNonFungibles(idsToBuy, {
      value: price * idsToBuy.length,
      from: accounts[0],
    });

    var bigNumber1 = await event.tickets(idsToBuy[0], accounts[0]);
    var bigNumber2 = await event.tickets(idsToBuy[1], accounts[0]);
    var ownerAddress1 = await event.ownerOf(idsToBuy[0]);
    var ownerAddress2 = await event.ownerOf(idsToBuy[1]);

    assert.equal(
      bigNumber1.toNumber(),
      1,
      "The first tickets was not assigned correctly"
    );

    assert.equal(
      ownerAddress1,
      accounts[0],
      "The first ticket was not assigned correctly"
    );

    assert.equal(
      bigNumber2.toNumber(),
      1,
      "The second tickets was not assigned correctly"
    );

    assert.equal(
      ownerAddress2,
      accounts[0],
      "The second ticket was not assigned correctly"
    );
  });

  it("should add acc1 to the buying queue", async () => {
    const numTickets = 1;

    await event.makeBuyOrder(ticketTypeId, numTickets, queuePercentage, {
      from: accounts[1],
      value: numTickets * price
    });

    var queue = await event.buyingQueue(ticketTypeId, queuePercentage);

    assert.equal(
      queue["tail"].toNumber(),
      1,
      "The tail of the buying queue was set incorrectly"
    );

    assert.equal(
      queue["head"].toNumber(),
      0,
      "The head of the buying queue was set incorrectly"
    );
  });

  it("should sell ticket from acc0 to acc1", async () => {

    await event.fillBuyOrderNonFungibles([ids[0]], queuePercentage, {
      from: accounts[0],
    });

    var ownerAddress = await event.ownerOf(ids[0]);
    assert.equal(
      ownerAddress,
      accounts[1],
      "The ticket was not transferred correctly"
    );
  });

  it("should post a non fungible ticket for sale", async () => {
    await printQueues(event, ticketTypeId);
    await event.makeSellOrderNonFungibles([ids[1]], [queuePercentage], {
      from: accounts[0],
    });

    var nfSeller = await event.nfTickets(ids[1]);
    assert.equal(
      nfSeller["userAddress"],
      accounts[0],
      "The ticket was not posted correctly"
    );
  });

  it("should buy allow acc1 to buy the ticket that is for sale.", async () => {
    await event.fillSellOrderNonFungibles([ids[1]], [queuePercentage], {
      from: accounts[1],
      value: price
    });

    var ownerAddress = await event.ownerOf(ids[1]);
    assert.equal(
      ownerAddress,
      accounts[1],
      "The ticket was not transferred correctly"
    );
  });

  it("should not allow to post a ticket for sale that one does not own", async () => {
    try {
      await event.makeSellOrderNonFungibles([ids[0]], [queuePercentage], { from: accounts[0] });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

  it("should not allow to join a nf sale if people are in the buying queue", async () => {
    const idsToBuyAcc2 = [ids[2], ids[3]];
    const numTickets = 1;

    await event.mintNonFungibles(idsToBuyAcc2, {
      value: price * idsToBuyAcc2.length,
      from: accounts[2],
    });

    await event.makeBuyOrder(ticketTypeId, numTickets, queuePercentage, {
      from: accounts[3],
      value: numTickets * price
    });

    try {
      await event.makeSellOrderNonFungibles([ids[2]], [queuePercentage], { from: accounts[2] });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });
});
