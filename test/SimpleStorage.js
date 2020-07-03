const SimpleStorage = artifacts.require("SimpleStorage");

contract("SimpleStorage", () => {
  let simpleStorage = null;

  before(async () => {
    simpleStorage = await SimpleStorage.deployed();
  });

  it("Smart contract deployment", async () => {
    var initialData = await simpleStorage.storedData.call();
    assert(initialData.toNumber() === 0);
  });

  it("Update storage", async () => {
    await simpleStorage.set(10);
    var updatedStorage = await simpleStorage.storedData.call();
    assert(updatedStorage.toNumber() === 10);
  });
});
