const {cidToArgs, argsToCid, fungibleBaseId} = require("idetix-utils");

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


contract("Presale", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const isNF = false;
  const finalizationBlock = 1000;
  const supplyPresale = 7;
  const durationInBlocks = 50;
  const ticketTypeId=fungibleBaseId;
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
    lotteryBlocknumber = currentBlock.number + durationInBlocks;

  });

  it("should create a presale", async () => {
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

    let presale = await event.lotteries(fungibleBaseId);

    assert.equal(
      presale["supply"],
      supplyPresale,
      "The presale supply is not set correctly."
    );

    assert.equal(
      presale["block"],
      lotteryBlocknumber,
      "The block number is not set correctly."
    );
  });

  it("should add account0 a presale", async () => {
    await event.joinPresale(fungibleBaseId, {from:accounts[0], value:price});

    const currentNonce = await event.nonces(fungibleBaseId);
    assert.equal(
      currentNonce,
      1,
      "The nonce is not set correctly."
    );

    const entry = await event.entries(fungibleBaseId,  accounts[0]);

    assert.equal(
      entry,
      1,
      "The entry is not set correctly."
    );
  });

  it("should add account1 a presale", async () => {
    await event.joinPresale(fungibleBaseId, {from:accounts[1], value:price});

    const currentNonce = await event.nonces(fungibleBaseId);
    assert.equal(
      currentNonce,
      2,
      "The nonce is not set correctly."
    );

    const entry = await event.entries(fungibleBaseId,  accounts[1]);

    assert.equal(
      entry,
      2,
      "The entry is not set correctly."
    );
  });

  it("should add account2 a presale", async () => {
    await event.joinPresale(fungibleBaseId, {from:accounts[2], value:price});

    const currentNonce = await event.nonces(fungibleBaseId);
    assert.equal(
      currentNonce,
      3,
      "The nonce is not set correctly."
    );

    const entry = await event.entries(fungibleBaseId,  accounts[2]);

    assert.equal(
      entry,
      3,
      "The entry is not set correctly."
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

  it("should add a ticket to account0", async () => {
    await event.claim(fungibleBaseId, {from:accounts[0]});
    const numberTickets = await event.tickets(fungibleBaseId, accounts[0])

    assert.equal(
      1,
      numberTickets.toNumber(),
      "The ticket is not added correctly."
    );
  });

  it("should add a ticket to account1", async () => {
    await event.claim(fungibleBaseId, {from:accounts[1]});
    const numberTickets = await event.tickets(fungibleBaseId, accounts[1])

    assert.equal(
      1,
      numberTickets.toNumber(),
      "The ticket is not added correctly."
    );
  });

  it("should add a ticket to account2", async () => {
    await event.claim(fungibleBaseId, {from:accounts[2]});
    const numberTickets = await event.tickets(fungibleBaseId, accounts[2])

    assert.equal(
      1,
      numberTickets.toNumber(),
      "The ticket is not added correctly."
    );
  });
});

