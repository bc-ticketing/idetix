const TestERC20Token = artifacts.require("TestERC20Token");
const EventFactory = artifacts.require("EventFactory");
const Identity = artifacts.require("Identity");
const SimpleStorage = artifacts.require("SimpleStorage");
const Event = artifacts.require("Event");
const IdetixLibrary = artifacts.require("IdetixLibrary");
const SafeMath = artifacts.require("SafeMath");


module.exports = async (deployer, network, accounts) => {

  await deployer.deploy(TestERC20Token, 10000000000000, "TestToken", "TTN");

  await deployer.deploy(Identity);
  console.log("Identity deployed at: " + Identity.address);

  await deployer.deploy(SafeMath);
  await deployer.deploy(IdetixLibrary);

  await deployer.link(SafeMath, EventFactory);
  await deployer.link(IdetixLibrary, EventFactory);

  await deployer.deploy(EventFactory, Identity.address);
  console.log("EventFactory deployed at: " + EventFactory.address);
};