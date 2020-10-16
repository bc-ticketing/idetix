const {cidToArgs, argsToCid} = require("idetix-utils");
const Identity = artifacts.require("Identity");

contract("Identity", (accounts) => {
  // accounts
  const identityApprover = accounts[0];
  const eventHost = accounts[1];
  const affiliate = accounts[2];
  const eventGuests = accounts.slice(3);

  let identity = null;
  const cid = "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u";
  const args = cidToArgs(cid);
  const level = 3;

  before(async () => {
    identity = await Identity.new();
  });

  it("should return the identity smart contract", async () => {
    assert.notEqual(
      identity.address !== "",
      "The identity contract address is not set correctly."
    );
  });

  it("should register acc0 as a identity approver", async () => {
    await identity.registerApprover(args.size, args.hashFunction, args.digest, {from: identityApprover});
    const approverInfo = await identity.getApproverInfo(identityApprover);

    assert.notEqual(
      approverInfo["digest"] !== args.digest,
      "The approverInfo is not set correctly."
    );
  });

  it("should approve acc1 with level 3", async () => {
    const approvedLevel = 3;
    await identity.approveIdentity(eventGuests[1], approvedLevel, {from: identityApprover});
    const storedLevel = await identity.getSecurityLevel(identityApprover, eventGuests[1]);

    assert.notEqual(
      storedLevel === approvedLevel,
      "The approved level is not set correctly."
    );
  });

  it("should return level 0 for non approved users", async () => {
    const nonApprovedAddress = eventGuests[2];
    const storedLevel = await identity.getSecurityLevel(identityApprover, nonApprovedAddress);

    assert.notEqual(
      storedLevel === 0,
      "The approved level is not set correctly."
    );
  });
});
