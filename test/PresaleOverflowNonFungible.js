const {cidToArgs, argsToCid, nonFungibleBaseId} = require("idetix-utils");

const EventPresale = artifacts.require("EventPresale");
const Identity = artifacts.require("Identity");

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
  const ticketTypeId = nonFungibleBaseId;
  const identityContract = Identity.address;
  const identityApprover = "0xB18D4a541216438D4480fBA37129e82a4ee49E88";
  const identityLevel = 0;
  const erc20Contract = "0x1Fe2b9481B57442Ea4147A0E0A5cF22245E3546E";
  let maxTicketsPerPerson;
  let currentBlockNumber;
  let ticketType;
  let lotteryBlocknumber;

  let event = null;

  before(async () => {
    const args = cidToArgs(cid);

    event = await EventPresale.new(
      accounts[0],
      args.hashFunction,
      args.size,
      args.digest,
      identityContract,
      identityApprover,
      identityLevel,
      erc20Contract,
    );

    currentBlock = await web3.eth.getBlock("latest");
    let lotteryBlocknumber = currentBlock.number + durationInBlocks;

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

    ticketType = await event.ticketTypeMeta(ticketTypeId);
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
      let ticketId = nonFungibleBaseId.plus(i, 10);
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

