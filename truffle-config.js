const path = require("path");

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  contracts_build_directory: path.join(__dirname, "abi"),
  networks: {
    ganache: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id
    },
    test: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
    },
    ganachecli: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*", // Match any network id
    },
    docker: {
      host: "ganache-cli",
      port: 8545,
      network_id: "*", // Match any network id
    },
  },
  compilers: {
    solc: {
      version: "0.6.8",
    },
  },
};
