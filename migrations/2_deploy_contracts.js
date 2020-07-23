const SimpleStorage = artifacts.require("SimpleStorage");
const TestERC20Token = artifacts.require("TestERC20Token");
const EventFactory = artifacts.require("EventFactory");

module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(SimpleStorage);
  await deployer.deploy(TestERC20Token);
  await deployer.deploy(EventFactory, SimpleStorage.address);
  console.log("EventFactory deployed at: " + EventFactory.address);
};