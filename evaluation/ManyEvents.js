const {cidToArgs, argsToCid, printQueues} = require("idetix-utils");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");
const TestERC20Token = artifacts.require("TestERC20Token");
const faker = require('faker');
const IpfsHttpClient = require("ipfs-http-client");
const FakeEvent = require("./FakeEvent");
const FakeTicket = require("./FakeTicket");

const EVENT_FACTORY_ADDRESS = process.env.EVENT_FACTORY_ADDRESS || null;
const IDENTITY_ADDRESS = process.env.IDENTITY_ADDRESS || null;
const TEST_ERC20_ADDRESS = process.env.TEST_ERC20_ADDRESS || null;

contract("Evaluation with many events", async (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const eventGuests = accounts.slice(2);

  // contracts
  var identity;
  var eventFactory;
  var testErc20Token;

  // evaluation params
  const numberOfEvents = 50;
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
    console.log("EventFactory contract at: " + process.env.EVENT_FACTORY_ADDRESS)
    console.log("Identity contract: " + process.env.IDENTITY_ADDRESS)
    console.log("TestErc20 Contract at: " + process.env.TEST_ERC20_ADDRESS)

    if(EVENT_FACTORY_ADDRESS==null || IDENTITY_ADDRESS==null || TEST_ERC20_ADDRESS==null)
      throw Error("EVENT_FACTORY_ADDRESS or IDENTITY_ADDRESS or TEST_ERC20_ADDRESS not set as env variable.");

    identity = await Identity.at(IDENTITY_ADDRESS);
    eventFactory = await EventFactory.at(EVENT_FACTORY_ADDRESS);
    testErc20Token = await TestERC20Token.at(TEST_ERC20_ADDRESS);

    ipfs = new IpfsHttpClient({
      host: "localhost",
      port: 5001,
      protocol: "http"
    });
  });

  it("should create many events", async () => {
    for(var i=0; i<numberOfEvents; i++){
      // create the event
      const fakeEvent = new FakeEvent();
      const jsonSchema = fakeEvent.toJsonSchema();

      // uplaod to ipfs
      console.log(jsonSchema.toString());
      const ipfsHash = await ipfs.add(jsonSchema.toString());
      console.log(ipfsHash.path)
      const args = cidToArgs(ipfsHash.path);

      console.log(args.hashFunction)
      console.log(args.size)
      console.log(args.digest)
      console.log(identityApprover)
      console.log(1)
      console.log(erc20Contract)
      console.log(granularities[Math.floor(Math.random()*granularities.length)])
      console.log({ from: eventHost })

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

        const argsTicket = cidToArgs(ipfsHashTicket.path);

        hashFunctions.push(argsTicket.hashFunction);
        sizes.push(argsTicket.size);
        digests.push(argsTicket.digest);
        isNfs.push(Math.random() >= 0.5);
        prices.push(randomInt(minTicketPrice, maxTicketPrice) );
        finalizationTimes.push(parseInt(Date.now()/1000) + maxFinalizationTime);
        supplies.push(randomInt(minTicketSupply, maxTicketSupply) );
      }

      console.log(hashFunctions);
      console.log(sizes);
      console.log(digests);
      console.log(isNfs);
      console.log(prices);
      console.log(finalizationTimes);
      console.log(supplies);

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