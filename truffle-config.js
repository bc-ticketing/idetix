const path = require("path");
const HDWalletProvider = require("@truffle/hdwallet-provider");
require('dotenv').config()


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
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(process.env.MNEMONIC, process.env.ROPSTEN_URL)
      },
      network_id: 3
    },
    rinkeby: {
      provider: function() {
        return new HDWalletProvider(process.env.MNEMONIC, process.env.RINKEBY_URL)
      },
      network_id: 4
    },
    kovan: {
      provider: function() {
        return new HDWalletProvider(process.env.MNEMONIC, process.env.KOVAN_URL)
      },
      network_id: 42
    }
  },
  compilers: {
    solc: {
      version: "0.6.8",
      settings: {
        optimizer: {
          enabled: true, // Default: false
          runs: 1     // Default: 200
        },
      }
    },
  },
  plugins: ["truffle-contract-size"]
};
