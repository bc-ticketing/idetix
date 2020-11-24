const {cidToArgs, argsToCid, printQueues} = require("idetix-utils");
const BigNumber = require("bignumber.js");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");
const TestERC20Token = artifacts.require("TestERC20Token");

contract("AftermarketNonFungibleDynamicBuyingErc", (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[2];
  const eventGuests = accounts.slice(3);

  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = new BigNumber("100", 10);
  const supply = 10;
  const isNF = true;
  const finalizationTime = parseInt(Date.now()/1000) + 1200; //two minutes in the future
  const granularity = 4;
  const identityContract = Identity.address;
  const identityLevel = 0;

  let eventFactory = null;
  let event = null;
  let ticketTypeId = null;
  let identity = null;
  let ids = null;
  let erc20 = null;

  before(async () => {
    // parse ipfs hash
    const args = cidToArgs(cid);

    // create new erc20 token contract
    erc20 = await TestERC20Token.new(new BigNumber("1000000000000000000000000", 10).toFixed(), "TestToken", "TST", {from: eventGuests[0]});
    await erc20.transfer(eventGuests[1], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[2], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[3], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[4], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[5], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[6], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});

    // create new identity contract
    identity = await Identity.new();
    // register identity approver
    await identity.registerApprover(args.hashFunction, args.size, args.digest, {from: identityApprover});

    // create a new event factory contract
    eventFactory = await EventFactory.new(identity.address);

    // create a new event contract
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20.address, granularity, {from: eventHost});

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEvents = await eventFactory.getPastEvents("EventCreated", { fromBlock: 1 });
    const eventContractAddress = pastSolidityEvents[pastSolidityEvents.length - 1].returnValues["_contractAddress"];

    // create new instance of the Event Contract
    event = await EventMintableAftermarketPresale.at(eventContractAddress);

    // create a new ticket type
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

  it("should return the event smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should not allow buying from the empty queue", async () => {
    const buyer = eventGuests[6];
    const seller = eventGuests[7];

    const idsToBuy = [ids[0], ids[1], ids[2], ids[4]];


    await erc20.approve(event.address, price.multipliedBy(idsToBuy.length).toFixed(), {from: seller});
    await event.mintNonFungibles(idsToBuy, [affiliate], {
      from: seller,
    });

    await erc20.approve(event.address, price.multipliedBy(idsToBuy.length).toFixed(), {from: buyer});
    try {
      await event.fillBuyOrderNonFungibles(idsToBuy, [100, 100, 100, 100], { from: buyer});
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }

  });

  it("should buy tickets for acc0 and sell them to queue 100", async () => {

    let buyer = eventGuests[9];
    const seller = eventGuests[8];
    const idsToBuy = [ids[5]];

    await erc20.approve(event.address, price.multipliedBy(idsToBuy.length).toFixed(), {from: buyer});

    assert.equal(
      price.multipliedBy(idsToBuy.length).toFixed(),
      (await erc20.allowance(buyer, event.address)).toNumber(),
      "The allowance was not set correctly"
    );

    await event.makeBuyOrder(ticketTypeId, idsToBuy.length, 100, {
      from: buyer
    });

    assert.equal(
      price.multipliedBy(idsToBuy.length).toFixed(),
      (await erc20.balanceOf(event.address)).toNumber(),
      "The erc 20 transfer was not done correctly"
    );
    await printQueues(event, ticketTypeId);

    await erc20.approve(event.address, price.multipliedBy(idsToBuy.length).toFixed(), {from: seller});
    await event.mintNonFungibles(idsToBuy, [affiliate], {
      from: seller,
    });

    assert.equal(
      price.multipliedBy(idsToBuy.length).toFixed(),
      (await erc20.balanceOf(event.address)).toNumber(),
      "The erc 20 transfer was not done correctly"
    );

    await event.fillBuyOrderNonFungibles(idsToBuy, [100], {
      from: seller
    });
    await printQueues(event, ticketTypeId);

    assert.equal(
      (await event.tickets(ticketTypeId, seller)).toNumber(),
      0,
      "The ticket was not assigned correctly"
    );

    assert.equal(
      (await event.tickets(ticketTypeId, buyer)).toNumber(),
      idsToBuy.length,
      "The ticket was not assigned correctly"
    );

  });

})