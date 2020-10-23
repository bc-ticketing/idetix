const {cidToArgs, argsToCid, printQueues} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");
const TestERC20Token = artifacts.require("TestERC20Token");
const faker = require('faker');
const IpfsHttpClient = require("ipfs-http-client");
const FakeEvent = require("./FakeEvent");
const FakeTicket = require("./FakeTicket");
const IdentityApprover = require("./IdentityApprover");

const EVENT_FACTORY_ADDRESS = process.env.EVENT_FACTORY_ADDRESS || null;
const IDENTITY_ADDRESS = process.env.IDENTITY_ADDRESS || null;
const TEST_ERC20_ADDRESS = process.env.TEST_ERC20_ADDRESS || null;

contract("Evaluation with many events", async (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[3]
  const eventGuests = accounts.slice(3);

  // contracts
  var identity;
  var eventFactory;
  var testErc20Token;

  // evaluation params
  const numberOfEvents = 2;
  const minTicketTypes = 1;
  const maxTicketTypes = 5; // not too high otherwise out of gas exception
  const maxTicketPrice = 10000000;
  const minTicketPrice = 10000;
  const maxTicketSupply = 100;
  const minTicketSupply = 1;
  const maxFinalizationTime = 12000000 // seconds in the future

  // const args = cidToArgs(cid);
  const finalizationTime = parseInt(Date.now()/1000) + 120000;
  const granularities = [50, 25, 20, 10, 5, 4, 2, 1];

  const identityLevel = 0;
  const erc20Contract = "0x0000000000000000000000000000000000000000";

  var ipfs;

  before(async () => {
    ipfs = new IpfsHttpClient({
      host: "localhost",
      port: 5001,
      protocol: "http"
    });

    console.log("EventFactory contract at: " + process.env.EVENT_FACTORY_ADDRESS)
    console.log("Identity contract: " + process.env.IDENTITY_ADDRESS)
    console.log("TestErc20 Contract at: " + process.env.TEST_ERC20_ADDRESS)

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
    testErc20Token = await TestERC20Token.at(TEST_ERC20_ADDRESS);
  });

  it("should create many events", async () => {
    for(var i=0; i<numberOfEvents; i++){
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
        1,
        erc20Contract,
        granularities[Math.floor(Math.random()*granularities.length)],
        { from: eventHost }
      );

      // crawl the event log of the contract to find the newly deployed "EventCreated"-event
      const pastSolidityEvents = await eventFactory.getPastEvents("EventCreated", { fromBlock: 1 });
      const eventContractAddress = pastSolidityEvents[pastSolidityEvents.length - 1].returnValues["_contractAddress"];

      // create new instance of the Event Contract
      const event = await EventMintableAftermarketPresale.at(eventContractAddress);

      var hashFunctions = [];
      var sizes = [];
      var digests = [];
      var isNfs = [];
      var prices = [];
      var finalizationTimes = [];
      var supplies = [];

      for(var j=0; j<randomInt(minTicketTypes, maxTicketTypes); j++){
        // create ticket type
        const ticketType = new FakeTicket(eventContractAddress)
        const jsonSchemaTicket = ticketType.toJsonSchema();

        //upload to ipfs
        const ipfsHashTicket = await ipfs.add(jsonSchemaTicket.toString());
        console.log("    Ticket type: " + ticketType.title + ", ipfs hash: " + ipfsHashTicket.path);

        const argsTicket = cidToArgs(ipfsHashTicket.path);

        hashFunctions.push(argsTicket.hashFunction);
        sizes.push(argsTicket.size);
        digests.push(argsTicket.digest);
        isNfs.push(Math.random() >= 0.5);
        prices.push(randomInt(minTicketPrice, maxTicketPrice) );
        finalizationTimes.push(parseInt(Date.now()/1000) + maxFinalizationTime);
        supplies.push(randomInt(minTicketSupply, maxTicketSupply) );
      }

      console.log("\n");

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
    }
  });
})

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min