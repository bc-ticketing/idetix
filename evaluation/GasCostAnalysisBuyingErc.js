const {cidToArgs, argsToCid, printQueues, prettyPrintAddress, getIdAsBigNumber} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");
const TestERC20Token = artifacts.require("TestERC20Token");
const faker = require('faker');
const IpfsHttpClient = require("ipfs-http-client");
const FakeEvent = require("./FakeEvent");
const FakeTicket = require("./FakeTicket");
const IdentityApprover = require("./IdentityApprover");
const BigNumber = require("bignumber.js");


const EVENT_FACTORY_ADDRESS = process.env.EVENT_FACTORY_ADDRESS || null;
const IDENTITY_ADDRESS = process.env.IDENTITY_ADDRESS || null;
const TEST_ERC20_ADDRESS = process.env.TEST_ERC20_ADDRESS || null;

contract("One Event", async (accounts) => {

  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[3]
  const eventGuests = accounts.slice(3);

  // contracts
  var identity;
  var eventFactory;
  var erc20;

  // evaluation params
  const gasPrice = 34;
  const ethPrice = 380;
  const numTickets = 10;

  // contracts
  var event;
  var maxTicketsPerPerson;

  // // evaluation params
  const price = new BigNumber("10000000");
  const supply = 1000;
  const granularity = 4;
  const percentages = [];
  for(var i=1; i<=granularity; i++) percentages.push(i*(100/granularity))
  const finalizationTime = parseInt(Date.now()/1000) + 12000000000;
  const isNf = false;

  const identityLevel = 0;
  const erc20Contract = TestERC20Token.deployed();

  var ipfs;

  const printTxDetails = (tx) => {
    const gas = new BigNumber(tx.receipt.gasUsed)
    const costEth = gas.dividedBy(1000000000).multipliedBy(gasPrice)
    const costUsd = costEth.multipliedBy(ethPrice)
    console.log("Gas used: " + gas.toFixed())
    console.log("Price in ETH: " + costEth.decimalPlaces(4).toFixed());
    console.log("Price in USD: " + costUsd.decimalPlaces(2).toFixed());
  }

  before(async () => {
    ipfs = new IpfsHttpClient({
      host: "localhost",
      port: 5001,
      protocol: "http"
    });

    // console.log("EventFactory contract at: " + process.env.EVENT_FACTORY_ADDRESS)
    // console.log("Identity contract: " + process.env.IDENTITY_ADDRESS)
    // console.log("TestErc20 Contract at: " + process.env.TEST_ERC20_ADDRESS)

    if(EVENT_FACTORY_ADDRESS==null || IDENTITY_ADDRESS==null || TEST_ERC20_ADDRESS==null)
      throw Error("EVENT_FACTORY_ADDRESS or IDENTITY_ADDRESS or TEST_ERC20_ADDRESS not set as env variable.");

    identity = await Identity.at(IDENTITY_ADDRESS);

    // register identity approver
    const identityApproverObject = new IdentityApprover("Idetix", [{level:1, value:"email"}, {level:2, value:"phone"}], "https://simonbachmann5.wixsite.com/mysite", "cladio3");
    const jsonSchema = identityApproverObject.toJsonSchema();

    // uplaod to ipfs
    const ipfsHash = await ipfs.add(jsonSchema.toString());
    const args = cidToArgs(ipfsHash.path);

    // persist on blockchain
    await identity.registerApprover(args.hashFunction, args.size, args.digest, {from: identityApprover});
    console.log("Identity approver registered. IPFS hash: " + ipfsHash.path + "\n");

    eventFactory = await EventFactory.at(EVENT_FACTORY_ADDRESS);
    // create new erc20 token contract
    erc20 = await TestERC20Token.new(new BigNumber("10000000000000000000000000", 10).toFixed(), "TestToken", "TST", {from: eventGuests[0]});
    await erc20.transfer(eventGuests[1], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[2], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[3], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[4], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[5], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[6], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[7], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[8], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});
    await erc20.transfer(eventGuests[9], new BigNumber("100000000000000000", 10).toFixed(), {from: eventGuests[0]});

  });

  it("should create an event", async () => {
    // create the event
    const fakeEvent = new FakeEvent();
    const jsonSchema = fakeEvent.toJsonSchema();
    // uplaod to ipfs
    const ipfsHash = await ipfs.add(jsonSchema.toString());
    const args = cidToArgs(ipfsHash.path);
    console.log("Event created title: " + fakeEvent.title + ", ipfs hash: " + ipfsHash.path);

    // store it to the blockchain
    await eventFactory.createEvent(
      args.hashFunction,
      args.size,
      args.digest,
      identityApprover,
      identityLevel,
      erc20.address,
      granularity,
      { from: eventHost }
    );

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEvents = await eventFactory.getPastEvents("EventCreated", { fromBlock: 1 });
    const eventContractAddress = pastSolidityEvents[pastSolidityEvents.length - 1].returnValues["_contractAddress"];

    // create new instance of the Event Contract
    event = await EventMintableAftermarketPresale.at(eventContractAddress);

    //make sure the set amount of tickets can be bought
    await event.setMaxTicketsPerPerson(numTickets);

    var hashFunctions = [];
    var sizes = [];
    var digests = [];
    var isNfs = [];
    var prices = [];
    var finalizationTimes = [];
    var supplies = [];

    // add fungible ticket type
    // create ticket type
    const ticketType = new FakeTicket(eventContractAddress)
    const jsonSchemaTicket = ticketType.toJsonSchema();

    //upload to ipfs
    const ipfsHashTicket = await ipfs.add(jsonSchemaTicket.toString());
    console.log("\tTicket type: " + ticketType.title + ", ipfs hash: " + ipfsHashTicket.path);

    const argsTicket = cidToArgs(ipfsHashTicket.path);

    hashFunctions.push(argsTicket.hashFunction);
    sizes.push(argsTicket.size);
    digests.push(argsTicket.digest);
    isNfs.push(false);
    prices.push(price.toFixed());
    finalizationTimes.push(finalizationTime);
    supplies.push(supply);


    // add non fungible ticket type
    // create ticket type
    const nfTicketType = new FakeTicket(eventContractAddress)
    const nfJsonSchemaTicket = nfTicketType.toJsonSchema();

    //upload to ipfs
    const nfIpfsHashTicket = await ipfs.add(nfJsonSchemaTicket.toString());
    console.log("\tTicket type: " + nfTicketType.title + ", ipfs hash: " + nfIpfsHashTicket.path);

    const nfArgsTicket = cidToArgs(nfIpfsHashTicket.path);

    hashFunctions.push(nfArgsTicket.hashFunction);
    sizes.push(nfArgsTicket.size);
    digests.push(nfArgsTicket.digest);
    isNfs.push(true);
    prices.push(price.toFixed());
    finalizationTimes.push(finalizationTime);
    supplies.push(supply);


    // store ticket types to the blockchain
    await event.createTypes(
      hashFunctions,
      sizes,
      digests,
      isNfs,
      prices,
      finalizationTimes,
      supplies,
      { from: eventHost }
    )

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEventsTicketType = await event.getPastEvents("TicketMetadata", { fromBlock: 1 });
    nfTypeId = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["ticketTypeId"];
    fTypeId = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 2].returnValues["ticketTypeId"];
    // read the default value set for max tickets per person
    maxTicketsPerPerson = await event.maxTicketsPerPerson();


    console.log("max=" + numTickets)
    await erc20.approve(event.address, price.multipliedBy(numTickets).toFixed(), {from: eventGuests[0]});
    const txF = await event.mintFungible(fTypeId, maxTicketsPerPerson, [affiliate], {
      from: eventGuests[0],
    });

    console.log("Fungible")
    printTxDetails(txF);

    idsToBuy = []

    for(i=0;i<numTickets;i++){
      idsToBuy.push(new BigNumber(nfTypeId).plus(i+1, 10).toFixed())
    }

    const txapprove = await erc20.approve(event.address, price.multipliedBy(idsToBuy.length).toFixed(), {from: eventGuests[1]});

    console.log("Approval")
    printTxDetails(txapprove);
    const txNf = await event.mintNonFungibles(idsToBuy, [affiliate], {
      from: eventGuests[1],
    });

    console.log("Non-Fungible")
    printTxDetails(txNf);

  });
})

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randomElement = (list) => list[Math.floor(Math.random() * list.length)]
