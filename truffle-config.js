// Allows us to use ES6 in migrations and tests.
require('babel-register')
require('babel-polyfill')

require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

const mnemonic = process.env.MNEMONIC;
const es_key = process.env.ETHERSCAN_KEY;
const infuraProjectId = "6b38131efce6467ca32aec6ebe619b68";

const provider = new HDWalletProvider({
  mnemonic: {
    phrase: mnemonic
  },
  providerOrUrl: `https://mainnet.infura.io/v3/${infuraProjectId}`,
  numberOfAddresses: 1,
  addressIndex: 9,
  shareNone: true,
  derivationPath: "m/44'/60'/0'/0"
})

module.exports = {
  plugins: [
    'truffle-plugin-verify',
  ],
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      gas: 6000000,
      network_id: "*" // Match any network id
    },
    goerli: {
      provider: () => provider,
      network_id: 5, // Goerli's network ID
      gas: 5500000, // Adjust the gas limit according to your contracts
    },
    mainnet: {
      provider: () => provider,
      network_id: 1,
    }
  },
  api_keys: {
    etherscan: es_key,
  },
  compilers: {
    solc: {
      version: "pragma",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  mocha: {
    enableTimeouts: false,
  }
};
