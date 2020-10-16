const path = require("path");
// var HDWalletProvider = require("truffle-hdwallet-provider");

const MNEMONIC = "diet forest region recycle weekend slow oxygen snow achieve film answer silent"

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
      network_id: "*" // Match any network id
    }
    // ropsten: {
    //   provider: function() {
    //     return new HDWalletProvider(MNEMONIC, "https://ropsten.infura.io/v3/d38bf7c38f08415ca03e5b4efcd763c8")
    //   },
    //   network_id: 3
    // }
  },
  compilers: {
    solc: {
      version: "0.6.8",
      settings: {
        optimizer: {
          enabled: true, // Default: false
          runs: 200     // Default: 200
        },
      }
    },
  },
  plugins: ["truffle-contract-size"]
};
