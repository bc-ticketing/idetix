const TestERC20Token = artifacts.require("TestERC20Token");
const EventFactory = artifacts.require("EventFactory");
const Identity = artifacts.require("Identity");
const SimpleStorage = artifacts.require("SimpleStorage");
const Event = artifacts.require("Event");

module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(SimpleStorage);

  await deployer.deploy(TestERC20Token);

  await deployer.deploy(Identity);
  console.log("Identity deployed at: " + Identity.address);

  await deployer.deploy(EventFactory, SimpleStorage.address);
  console.log("EventFactory deployed at: " + EventFactory.address);
};