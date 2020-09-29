const {cidToArgs, argsToCid} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("AffiliateFungible", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 100;
  const supply = 5;
  const isNF = false;
  const finalizationTime = parseInt(Date.now()/1000) + 120; //two minutes in the future
  const identityContract = Identity.address;
  const identityApprover = accounts[2];
  const identityLevel = 0;
  const erc20Contract = "0x0000000000000000000000000000000000000000";
  const granularity = 1;
  let ticketTypeId = null;
  let identity = null;
  let event = null;
  let eventFactory = null;
  let maxTicketsPerPerson = 0;

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
    await event.createTypes(
      [args.hashFunction],
      [args.size],
      [args.digest],
      [isNF],
      [price],
      [finalizationTime],
      [supply]
    );

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEventsTicketType = await event.getPastEvents("TicketMetadata", { fromBlock: 1 });
    ticketTypeId = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["ticketTypeId"];

    // read the default value set for max tickets per person
    maxTicketsPerPerson = await event.maxTicketsPerPerson();

    await event.createTypes(
      [args.hashFunction],
      [args.size],
      [args.digest],
      [isNF],
      [price],
      [finalizationTime],
      [supply]
    );

    let ticketType = await event.ticketTypeMeta(ticketTypeId);

  });

  it("should mint 1 ticket for acc0 and pay affiliate fee to acc1 and identity approver fee to acc2", async () => {
    const numTickets = 1;

    const balanceBeforeAcc0 = await web3.eth.getBalance(accounts[0]);
    const balanceBeforeAcc1 = await web3.eth.getBalance(accounts[1]);
    const balanceBeforeAcc2 = await web3.eth.getBalance(accounts[2]);

    await event.mintFungible(ticketTypeId, numTickets, [accounts[1]], {
      value: price,
      from: accounts[0],
    });


    var bigNumber = await event.tickets(ticketTypeId, accounts[0]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned correctly"
    );

    const balanceAfterAcc0 = await web3.eth.getBalance(accounts[0]);
    const balanceAfterAcc1 = await web3.eth.getBalance(accounts[1]);
    const balanceAfterAcc2 = await web3.eth.getBalance(accounts[2]);

    const totalCostAcc0 = balanceAfterAcc0 - balanceBeforeAcc0;
    const totalCostAcc1 = balanceAfterAcc1 - balanceBeforeAcc1;
    const totalCostAcc2 = balanceAfterAcc2 - balanceBeforeAcc2;

    // console.log("balance: " + balanceBeforeAcc0 + " " + balanceAfterAcc0 + " " + totalCostAcc0)
    // console.log("balance: " + balanceBeforeAcc1 + " " + balanceAfterAcc1 + " " + totalCostAcc1)
    // console.log("balance: " + balanceBeforeAcc2 + " " + balanceAfterAcc2 + " " + totalCostAcc2)

    assert(
      balanceAfterAcc1 > balanceBeforeAcc1,
      "The affiliate fee was not payed"
    );


    assert(
      balanceAfterAcc2 > balanceBeforeAcc2,
      "The identity approver fee was not payed"
    );
  });
});
