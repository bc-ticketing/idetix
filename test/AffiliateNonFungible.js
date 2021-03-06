const {cidToArgs, argsToCid} = require("idetix-utils");
const BigNumber = require("bignumber.js");
const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("AffiliateNonFungible", (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[2];
  const eventGuests = accounts.slice(3);

  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = new BigNumber("1000000000000000", 10);
  const supply = 10;
  const isNF = true;
  const finalizationTime = parseInt(Date.now()/1000) + 1200; //two minutes in the future
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

  it("should mint 2 fungible tickets for acc0 and pay the affiliate fee to acc1 and identity approver fee to acc2", async () => {
    const idsToBuy = [ids[0], ids[1]];
    var assignedOwner;

    const balanceBeforeAcc0 = new BigNumber(await web3.eth.getBalance(eventGuests[0]));
    const balanceBeforeAffiliate = new BigNumber(await web3.eth.getBalance(affiliate));
    const balanceBeforeIdentityApprover = new BigNumber(await web3.eth.getBalance(identityApprover));
    const balanceBeforeEventHost = new BigNumber(await web3.eth.getBalance(eventHost));

    await event.mintNonFungibles(idsToBuy, [affiliate], {
      value: price.multipliedBy(idsToBuy.length).toFixed(),
      from: eventGuests[0],
    });


    const balanceAfterAcc0 = new BigNumber(await web3.eth.getBalance(eventGuests[0]));
    const balanceAfterAffiliate = new BigNumber(await web3.eth.getBalance(affiliate));
    const balanceAfterIdentityApprover = new BigNumber(await web3.eth.getBalance(identityApprover));
    const balanceAfterEventHost = new BigNumber(await web3.eth.getBalance(eventHost));

    assert(
      balanceAfterAffiliate.isGreaterThan(balanceBeforeAffiliate),
      "The affiliate fee was not paid correctly"
    );

    assert(
      balanceAfterIdentityApprover.isGreaterThan(balanceBeforeIdentityApprover),
      "The identity approver fee was not paid correctly"
    );

    assert(
      balanceAfterEventHost.isGreaterThan(balanceBeforeEventHost),
      "The identity approver fee was not paid correctly"
    );

  });
});
