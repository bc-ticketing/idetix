const SimpleStorage = artifacts.require("SimpleStorage");
const EventLibrary = artifacts.require("EventLibrary");
const EventFactory = artifacts.require("EventFactory");
const TestERC20Token = artifacts.require("TestERC20Token");

module.exports = function (deployer) {
  deployer.deploy(SimpleStorage);
  deployer.deploy(EventLibrary);
  deployer.deploy(EventFactory);
  deployer.deploy(TestERC20Token);
};
