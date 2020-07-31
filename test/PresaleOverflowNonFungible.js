const {cidToArgs, argsToCid} = require("idetix-utils");
const BigNumber = require("bignumber.js");

const EventMintableAftermarketPresale = artifacts.require("EventMintableAftermarketPresale");
const Identity = artifacts.require("Identity");
const EventFactory = artifacts.require("EventFactory");

const skipBlock = async (n) => {
  for(i=0; i<n; i++){
    await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_mine",
      id: 12345
    }, function(err, result) {});
  }
}

contract("PresaleOverflowNonFungible", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const isNF = true;
  const finalizationBlock = 1000;
  const supplyPresale = 7;
  const durationInBlocks = 50;
  const identityApprover = "0xB18D4a541216438D4480fBA37129e82a4ee49E88";
  const identityLevel = 0;
  const erc20Contract = "0x1Fe2b9481B57442Ea4147A0E0A5cF22245E3546E";
  const granularity = 1;
  let eventFactory = null;
  let event = null;
  let maxTicketsPerPerson;
  let currentBlockNumber;
  let lotteryBlocknumber;

  before(async () => {
    // parse ipfs hash
    const args = cidToArgs(cid);

    // create new identity contract
    identity = await Identity.new();

    // create a new event factory contract
    eventFactory = await EventFactory.new(identity.address);

    // create a new event
    await eventFactory.createEvent(args.hashFunction, args.size, args.digest, identityApprover, identityLevel, erc20Contract, granularity);

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEvents = await eventFactory.getPastEvents("EventCreated", { fromBlock: 1 });
    const eventContractAddress = pastSolidityEvents[pastSolidityEvents.length - 1].returnValues["_contractAddress"];

    // create new instance of the Event Contract
    event = await EventMintableAftermarketPresale.at(eventContractAddress);

    // set future block number
    currentBlock = await web3.eth.getBlock("latest");
    lotteryBlocknumber = currentBlock.number + durationInBlocks;

    // create a new ticket type
    await event.createPresaleType(
      args.hashFunction,
      args.size,
      args.digest,
      isNF,
      price,
      finalizationBlock,
      supplyPresale,
      lotteryBlocknumber
    );

    // crawl the event log of the contract to find the newly deployed "EventCreated"-event
    const pastSolidityEventsTicketType = await event.getPastEvents("TicketMetadata", { fromBlock: 1 });
    ticketTypeId = pastSolidityEventsTicketType[pastSolidityEventsTicketType.length - 1].returnValues["ticketTypeId"];

    // read the default value set for max tickets per person
    maxTicketsPerPerson = await event.maxTicketsPerPerson();
  });

  it("should add 10 accounts to the presale", async () => {

    const joinPresale = async (account) => {
      await event.joinPresale(ticketTypeId, {from:account, value:price});
    }

    accounts.forEach(joinPresale);

    const currentNonce = await event.nonces(ticketTypeId);
    assert.equal(
      currentNonce,
      10,
      "The nonce is not set correctly."
    );
  });

  it("should skip to the end of the lottery", async () => {
    let previousBlock = await web3.eth.getBlock("latest");

    await skipBlock(durationInBlocks);

    currentBlock = await web3.eth.getBlock("latest");

    assert.equal(
      currentBlock.number,
      previousBlock.number + durationInBlocks,
      "The block is not mined correctly."
    );
  });

  it("should should only assign the correct amount of tickets available accross all accounts.", async () => {
    for(account of accounts){
      await event.claim(ticketTypeId, {from:account});
    }

    let assignedTickets = 0;

    for(let i = 1; i <= supplyPresale; i++){
      let ticketId = new BigNumber(ticketTypeId).plus(i, 10);
      let owner = await event.nfOwners(ticketId.toString(10));
      if(accounts.includes(owner)){
        assignedTickets++;
        console.log(account + " :" + ticketId.toString(10))
      }
    }

    assert.equal(
      assignedTickets,
      supplyPresale,
      "The number of tickets was not assigned correctly."
    );
  });
});

