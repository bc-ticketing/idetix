const SimpleStorage = artifacts.require("SimpleStorage");
const EventLibrary = artifacts.require("EventLibrary");
const EventFactory = artifacts.require("EventFactory");
const Identity = artifacts.require("Identity");

module.exports = function (deployer) {
  deployer.deploy(SimpleStorage);
  deployer.deploy(EventLibrary);
  deployer.deploy(EventFactory);
  deployer.deploy(Identity);
};
