const multihashes = require("multihashes");

const FungibleTicketFactory = artifacts.require("FungibleTicketFactory");
const Event = artifacts.require("Event");
const EventFactory = artifacts.require("EventFactory");
const TestERC20Token = artifacts.require("TestERC20Token");

// address[0]: event owner, erc20 owner
// address[1:10]: guests

// util function to decode IPFS CID
const cidToArgs = (cid) => {
  const mh = multihashes.fromB58String(Buffer.from(cid));
  return {
    hashFunction: "0x" + mh.slice(0, 1).toString("hex"),
    size: "0x" + mh.slice(1, 2).toString("hex"),
    digest: "0x" + mh.slice(2).toString("hex"),
  };
};

// util function to recover IPFS CID
const argsToCid = (hashFunction, size, digest) => {
  const hashHex = hashFunction.slice(2) + size.slice(2) + digest.slice(2);
  const hashBytes = Buffer.from(hashHex, "hex");
  return multihashes.toB58String(hashBytes);
};

contract("Event", (accounts) => {
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const numberTickets = 3;
  const ticketPrice = 10;

  let fungibleTicketFactory = null;
  let fungibleTicketFactoryAddress = null;
  let testERC20Token = null;
  let erc20TokenAddress = null;
  const initialSupply = 1000;

  before(async () => {
    const args = cidToArgs(cid);

    testERC20Token = await TestERC20Token.deployed();
    erc20TokenAddress = testERC20Token.address;

    eventFactory = await EventFactory.deployed();
    await eventFactory.createEvent(
      args.hashFunction,
      args.size,
      args.digest,
      erc20TokenAddress
    );
    const eventAddress = await eventFactory.events(0);
    event = await Event.at(eventAddress);

    await event.addFungibleTicketFactory(
      args.hashFunction,
      args.size,
      args.digest,
      ticketPrice,
      numberTickets
    );

    fungibleTicketFactoryAddresses = await event.getFunglibleTicketFactories();
    fungibleTicketFactoryAddress = fungibleTicketFactoryAddresses[0];
    fungibleTicketFactory = await FungibleTicketFactory.at(
      fungibleTicketFactoryAddress
    );
  });

  it("should return the initially set token supply to account[0]", async () => {
    // const setTicketPrice = await fungibleTicketFactory.ticketPrice.call();

    assert.equal(
      await testERC20Token.balanceOf(accounts[0]),
      initialSupply,
      "Initial supply was not correctly assigned to account[0]"
    );

    // send some ERC tokens to other accounts
    await testERC20Token.transfer(accounts[1], 100);
    await testERC20Token.transfer(accounts[2], 100);
    await testERC20Token.transfer(accounts[3], 100);

    assert.equal(
      await testERC20Token.balanceOf(accounts[1]),
      100,
      "Tokens were not correctly transferred to other accounts"
    );
  });

  it("should assign a ticket to account[1]", async () => {
    let account = accounts[1];
    let balanceGuestBefore = await testERC20Token.balanceOf(accounts[1]);
    let balanceEventOwnerBefore = await testERC20Token.balanceOf(accounts[0]);

    // before tickets can be bought with ERC20, the user must allow the smart contract to spend tokens on their behalf
    await testERC20Token.approve(fungibleTicketFactoryAddress, ticketPrice, {
      from: account,
    });

    await fungibleTicketFactory.buyTicketWithERC20({
      from: account,
    });

    let balanceGuestAfter = await testERC20Token.balanceOf(accounts[1]);
    let balanceEventOwnerAfter = await testERC20Token.balanceOf(accounts[0]);

    // check ownership
    assert.equal(
      await fungibleTicketFactory.hasTicket(account),
      true,
      "The owner of the ticket was not set correctly."
    );

    // check balances
    assert.equal(
      balanceGuestAfter.toNumber(),
      balanceGuestBefore.toNumber() - ticketPrice,
      "The tokens were transferred incorectly. Buyer still has the tokens."
    );
    assert.equal(
      balanceEventOwnerAfter.toNumber(),
      balanceEventOwnerBefore.toNumber() + ticketPrice,
      "The tokens were transferred incorectly. Event owner did not reveice the tokens."
    );
  });

  // it("should return the initially set number of tickets", async () => {
  //   const setNumberOfTickets = await fungibleTicketFactory.numberTickets.call();

  //   assert.equal(
  //     setNumberOfTickets.toNumber(),
  //     numberTickets,
  //     "The number of tickets was not set correctly."
  //   );
  // });

  // it("should return the initially set IPFS CID.", async () => {
  //   const pastEvents = await fungibleTicketFactory.getPastEvents("IpfsCid", {
  //     fromBlock: 1,
  //   });
  //   const latestEvent = pastEvents[pastEvents.length - 1].returnValues;

  //   const loadedCid = argsToCid(
  //     latestEvent["hashFunction"],
  //     latestEvent["size"],
  //     latestEvent["digest"]
  //   );

  //   assert.equal(loadedCid, cid, "The IPFS CID was not updated correctly.");
  // });

  // it("should assign a ticket to account[0]", async () => {
  //   await fungibleTicketFactory.buyTicketWithETH({
  //     value: ticketPrice,
  //     from: accounts[0],
  //   });

  //   assert.equal(
  //     await fungibleTicketFactory.hasTicket(accounts[0]),
  //     true,
  //     "The owner of the ticket was not set correctly."
  //   );
  // });

  // it("should assign a ticket to account[1]", async () => {
  //   await fungibleTicketFactory.buyTicketWithETH({
  //     value: ticketPrice,
  //     from: accounts[1],
  //   });

  //   assert.equal(
  //     await fungibleTicketFactory.hasTicket(accounts[1]),
  //     true,
  //     "The owner of the ticket was not set correctly."
  //   );
  // });

  // it("should assign a ticket to account[2]", async () => {
  //   await fungibleTicketFactory.buyTicketWithETH({
  //     value: ticketPrice,
  //     from: accounts[2],
  //   });

  //   assert.equal(
  //     await fungibleTicketFactory.hasTicket(accounts[2]),
  //     true,
  //     "The owner of the ticket was not set correctly."
  //   );
  // });

  // it("should not allow account[3] to buy a ticket", async () => {
  //   let err = null;

  //   try {
  //     await fungibleTicketFactory.buyTicketWithETH({
  //       value: ticketPrice,
  //       from: accounts[3],
  //     });
  //   } catch (error) {
  //     err = error;
  //   }

  //   assert.ok(err instanceof Error);
  // });

  // it("should add the buyer to the buying queue account[3]", async () => {
  //   await fungibleTicketFactory.joinBuyingQueueWithETH({
  //     value: ticketPrice,
  //     from: accounts[3],
  //   });

  //   const buyingQueueHead = await fungibleTicketFactory.buyingQueueHead();
  //   const address = await fungibleTicketFactory.buyingQueue(buyingQueueHead);

  //   assert.equal(
  //     address,
  //     accounts[3],
  //     "The owner of the ticket was not added to the buying queue."
  //   );
  // });

  // it("should sell the ticket to account[3]", async () => {
  //   const account = accounts[0];

  //   await fungibleTicketFactory.sellFungibleTicket({
  //     from: account,
  //   });

  //   assert.equal(
  //     await fungibleTicketFactory.hasTicket(accounts[3]),
  //     true,
  //     "The ownership of the ticket was not transferred correctly. Buyer has not received the ticket."
  //   );

  //   assert.equal(
  //     await fungibleTicketFactory.hasTicket(accounts[0]),
  //     false,
  //     "The ownership of the ticket was not transferred correctly. Seller still owns the ticket."
  //   );
  // });

  // it("should add the seller to the selling queue account[1]", async () => {
  //   const account = accounts[1];
  //   await fungibleTicketFactory.sellFungibleTicket({
  //     from: account,
  //   });

  //   const sellingQueueHead = await fungibleTicketFactory.sellingQueueHead();

  //   const sellerAddress = await fungibleTicketFactory.sellingQueue(
  //     sellingQueueHead
  //   );
  //   assert.equal(
  //     sellerAddress,
  //     account,
  //     "The ownership of the ticket was not transferred correctly."
  //   );
  // });

  // it("should assign a ticket to account[4]", async () => {
  //   await fungibleTicketFactory.buyTicketWithETH({
  //     value: ticketPrice,
  //     from: accounts[4],
  //   });

  //   assert.equal(
  //     await fungibleTicketFactory.hasTicket(accounts[1]),
  //     false,
  //     "The ownership of the ticket was not transferred correctly. Seller still has the ticket."
  //   );

  //   assert.equal(
  //     await fungibleTicketFactory.hasTicket(accounts[4]),
  //     true,
  //     "The ownership of the ticket was not transferred correctly. Buyer did not receive the ticket."
  //   );
  // });
});
