const {cidToArgs, argsToCid} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

contract("Fungible", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 77777;
  const supply = 5;
  const isNF = false;
  const finalizationTime = parseInt(Date.now()/1000) + 120; //two minutes in the future
  const identityContract = Identity.address;
  const identityApprover = "0xB18D4a541216438D4480fBA37129e82a4ee49E88";
  const identityLevel = 0;
  const erc20Contract = accounts[9];
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
    await eventFactory.createEvent(
      args.hashFunction,
      args.size,
      args.digest,
      identityApprover,
      identityLevel,
      erc20Contract,
      granularity
    );

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

  });

  it("should mint 1 ticket for acc0 and reward account 8 with affiliate share and account 9 with identity reward", async () => {
    const numTickets = 1;
    const balanceBeforeAcc0 = await web3.eth.getBalance(accounts[0]);
    const balanceBeforeAcc8 = await web3.eth.getBalance(accounts[8]);
    const balanceBeforeAcc9 = await web3.eth.getBalance(accounts[9]);

    const balanceAfterAcc0 = await web3.eth.getBalance(accounts[0]);
    const balanceAfterAcc8 = await web3.eth.getBalance(accounts[8]);
    const balanceAfterAcc9 = await web3.eth.getBalance(accounts[9]);

    console.log("balance " + balanceBeforeAcc0 + " " + balanceAfterAcc0 + " " + balanceAfterAcc0 - balanceBeforeAcc0)
    console.log("balance " + balanceBeforeAcc8 + " " + balanceAfterAcc8 + " " + balanceAfterAcc8 - balanceBeforeAcc8)
    console.log("balance " + balanceBeforeAcc9 + " " + balanceAfterAcc9 + " " + balanceAfterAcc9 - balanceBeforeAcc9)

    await event.mintFungible(ticketTypeId, numTickets, [accounts[8]], {
      value: price,
      from: accounts[0],
    });

    var bigNumber = await event.tickets(ticketTypeId, accounts[0]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned correctly"
    );





  });
});
