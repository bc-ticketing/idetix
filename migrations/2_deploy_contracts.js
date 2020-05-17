const SimpleStorage = artifacts.require("SimpleStorage");
const EventLibrary = artifacts.require("EventLibrary");
const EventFactory = artifacts.require("EventFactory");

module.exports = function (deployer) {
  deployer.deploy(SimpleStorage);
  deployer.deploy(EventLibrary);
  deployer.deploy(EventFactory);
};
