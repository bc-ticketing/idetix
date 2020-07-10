const {cidToArgs, argsToCid, fungibleBaseId} = require("idetix-utils");

const EventMintableAftermarket = artifacts.require("EventMintableAftermarket");

contract("AftermarketFungible", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const price = 1000;
  const supply = 5;
  const isNF = false;
  const finalizationBlock = 1000;


  let event = null;
  let maxTicketsPerPerson = 0;

  before(async () => {
    const args = cidToArgs(cid);

    event = await EventMintableAftermarket.new(
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
    maxTicketsPerPerson = await event.maxTicketsPerPerson();

  });

  it("should return the event smart contract", async () => {
    assert.notEqual(
      event.address !== "",
      "The event address is not set correctly."
    );
  });

  it("should buy 1 ticket for acc0", async () => {
    const numTickets = 1;

    await event.mintFungible(fungibleBaseId, numTickets, {
      value: price * numTickets,
      from: accounts[0],
    });

    var bigNumber = await event.tickets(fungibleBaseId, accounts[0]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned correctly"
    );
  });

  it("should add acc0 selling queue (Aftermarket contract)", async () => {
    const numTickets = 1;

    await event.makeSellOrderFungibles(fungibleBaseId, numTickets, {
      from: accounts[0],
    });

    var queue = await event.sellingQueue(fungibleBaseId);

    assert.equal(
      queue["tail"].toNumber(),
      1,
      "The tail of the selling queue was set incorrectly"
    );

    assert.equal(
      queue["head"].toNumber(),
      0,
      "The head of the selling queue was set incorrectly"
    );
  });

  it("should buy the ticket from the selling queue acc0 -> acc1 (Aftermarket contract)", async () => {
    const numTickets = 1;

    await event.fillSellOrderFungibles(fungibleBaseId, numTickets, {
      value: price * numTickets,
      from: accounts[1],
    });

    var bigNumber = await event.tickets(fungibleBaseId, accounts[1]);

    assert.equal(bigNumber.toNumber(), numTickets, "The ticket was not added.");

    var bigNumber = await event.tickets(fungibleBaseId, accounts[0]);

    assert.equal(bigNumber.toNumber(), 0, "The ticket was not subracted.");

    var queue = await event.sellingQueue(fungibleBaseId);

    assert.equal(
      queue["tail"].toNumber(),
      1,
      "The tail of the selling queue was set incorrectly"
    );

    assert.equal(
      queue["head"].toNumber(),
      1,
      "The head of the selling queue was set incorrectly"
    );
  });

  it("should add acc0 to buying queue (Aftermarket contract)", async () => {
    const numTickets = 1;

    await event.makeBuyOrder(fungibleBaseId, numTickets, {
      value: price,
      from: accounts[0],
    });

    var queue = await event.buyingQueue(fungibleBaseId);

    assert.equal(
      queue["tail"].toNumber(),
      1,
      "The tail of the buying queue was set incorrectly"
    );

    assert.equal(
      queue["head"].toNumber(),
      0,
      "The head of the buying queue was set incorrectly"
    );
  });

  it("should sell the ticket to the buying queue acc1 -> acc0 (Aftermarket contract)", async () => {
    const numTickets = 1;

    await event.fillBuyOrderFungibles(fungibleBaseId, numTickets, {
      from: accounts[1],
    });

    var bigNumber = await event.tickets(fungibleBaseId, accounts[0]);

    assert.equal(
      bigNumber.toNumber(),
      numTickets,
      "The ticket was assigned incorrectly"
    );

    var queue = await event.buyingQueue(fungibleBaseId);

    assert.equal(
      queue["tail"].toNumber(),
      1,
      "The tail of the buying queue was set incorrectly"
    );

    assert.equal(
      queue["head"].toNumber(),
      1,
      "The head of the buying queue was set incorrectly"
    );
  });

  it("should not allow buying more tickets than allowed", async () => {
    const moreThanMaxTicketsPerPerson = 3;

    const priceMaxTickets = maxTicketsPerPerson * price;
    const priceMoreThanAllowed = moreThanMaxTicketsPerPerson * price;

    await event.mintFungible(fungibleBaseId, maxTicketsPerPerson, { value: priceMaxTickets , from: accounts[2] });
    await event.makeSellOrderFungibles(fungibleBaseId, maxTicketsPerPerson, { from: accounts[2] });
    await event.mintFungible(fungibleBaseId, maxTicketsPerPerson, { value: priceMaxTickets, from: accounts[3] });
    await event.makeSellOrderFungibles(fungibleBaseId, maxTicketsPerPerson, { from: accounts[3] });

    try {
      await event.fillSellOrderFungibles(fungibleBaseId, moreThanMaxTicketsPerPerson, {  value: priceMoreThanAllowed, from: accounts[4] });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });

  it("should not allow buying multiple tickets less than the multiple price", async () => {
    const priceTicketsAllowed = maxTicketsPerPerson * price;

    await event.mintFungible(fungibleBaseId, maxTicketsPerPerson, { value: priceTicketsAllowed , from: accounts[5] });
    await event.makeSellOrderFungibles(fungibleBaseId, maxTicketsPerPerson, { from: accounts[5] });

    try {
      await event.fillSellOrderFungibles(fungibleBaseId, maxTicketsPerPerson, { value: price, from: accounts[6] });
      assert.fail("The transaction should have thrown an error");
    }
    catch (err) {
      assert.include(err.message, "revert", "The error message should contain 'revert'");
    }
  });
});
