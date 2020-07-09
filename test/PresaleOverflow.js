const {cidToArgs, argsToCid, fungibleBaseId} = require("idetix-utils");

const EventPresale = artifacts.require("EventPresale");

const skipBlock = async (n) => {
  for(i=0; i<n; i++){
    await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_mine",
      id: 12345
    }, function(err, result) {});
  }
}

contract("Presale", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 5;
  const isNF = false;
  const finalizationBlock = 1000;
  const supplyPresale = 9;
  let maxTicketsPerPerson;
  let currentBlockNumber;
  let ticketType;
  const durationInBlocks = 50;

  let event = null;

  before(async () => {
    const args = cidToArgs(cid);

    event = await EventPresale.new(
      accounts[0],
      args.hashFunction,
      args.size,
      args.digest
    );

    await event.createType(
      args.hashFunction,
      args.size,
      args.digest,
      isNF,
      price,
      finalizationBlock,
      supply
    );

    ticketType = await event.ticketTypeMeta(fungibleBaseId);
    maxTicketsPerPerson = await event.maxTicketsPerPerson();
    currentBlock = await web3.eth.getBlock("latest");

    let lotteryBlocknumber = currentBlock.number + durationInBlocks;

    await event.createPresale(
      fungibleBaseId,
      supplyPresale,
      lotteryBlocknumber,
    );
  });

  it("should add 10 accounts to the presale", async () => {

    const joinPresale = async (account) => {
      await event.joinPresale(fungibleBaseId, {from:account, value:price});
    }

    accounts.forEach(joinPresale);

    const currentNonce = await event.nonces(fungibleBaseId);
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
      await event.claim(fungibleBaseId, {from:account});
    }

    let assignedTickets = 0;

    for(account of accounts){
      let amount = await event.tickets(fungibleBaseId, account);
      console.log(account + " :" + amount.toNumber())
      assignedTickets += amount.toNumber();
    }

    assert.equal(
      assignedTickets,
      supplyPresale,
      "The number of tickets was not assigned correctly."
    );
  });
});

