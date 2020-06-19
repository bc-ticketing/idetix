const SimpleStorage = artifacts.require("SimpleStorage");
const TestERC20Token = artifacts.require("TestERC20Token");

module.exports = function (deployer) {
  deployer.deploy(SimpleStorage);
  deployer.deploy(TestERC20Token);
};
