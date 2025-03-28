// require("@nomiclabs/hardhat-waffle");
// require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@nomicfoundation/hardhat-chai-matchers");
require("solidity-coverage");

require("dotenv").config();

const settings = {
  optimizer: {
    enabled: true,
    runs: 200,
  },
};
function mnemonic() {
  let pv_arr = [];
  if (process.env.PRIVATE_KEY) {
    pv_arr.push(process.env.PRIVATE_KEY);
  }
  if (process.env.PRIVATE_KEY1) {
    pv_arr.push(process.env.PRIVATE_KEY1);
  }
  if (process.env.PRIVATE_KEY2) {
    pv_arr.push(process.env.PRIVATE_KEY2);
  }
  return pv_arr;
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://localhost:8545",
      //gasPrice: 125000000000,  // you can adjust gasPrice locally to see how much it will cost on production
      /*
        notice no mnemonic here? it will just use account 0 of the hardhat node to deploy
        (you can put in a mnemonic here to set the deployer locally)
      */
    },

    mainnet: {
      url: "https://mainnet.infura.io/v3/" + process.env.INFURA_ID, //<---- YOUR INFURA ID! (or it won't work)
      accounts: mnemonic(),
    },
    sepolia: {
      url: "https://sepolia.infura.io/v3/" + process.env.INFURA_ID, //<---- YOUR INFURA ID! (or it won't work)
      accounts: mnemonic(),
    },
    matic: {
      url: "https://polygon-mainnet.infura.io/v3/" + process.env.INFURA_ID,
      accounts: mnemonic(),
    },
    optimism: {
      // url: "https://optimism-mainnet.infura.io/v3/" + process.env.INFURA_ID,
      url: "https://optimism.llamarpc.com",
      accounts: mnemonic(),
    },
    "optimism-sepolia": {
      url: "https://sepolia.optimism.io",
      accounts: mnemonic(),
      chainId: 11155420,
      timeout: 60000, // Increase timeout to 60 seconds
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: mnemonic(),
    },
    scroll: {
      url: "https://rpc.scroll.io/",
      accounts: mnemonic(),
    },
    base: {
      // this is a custom network
      url: "https://mainnet.base.org/",
      accounts: mnemonic(),
    },
    polygonZKEVM: {
      // this is a custom network
      url: "https://zkevm-rpc.com",
      accounts: mnemonic(),
    },
    linea: {
      url: "https://linea-mainnet.infura.io/v3/" + process.env.INFURA_ID,
      accounts: mnemonic(),
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.EHTERSCAN_KEY,
      sepolia: process.env.EHTERSCAN_KEY,
      scroll: process.env.SCROLLSCAN_KEY,
      optimisticEthereum: process.env.OP_KEY,
      "optimism-sepolia": process.env.OPTIMISM_SCAN_KEY,
      arbitrumOne: process.env.ARBI_KEY,
      polygonZKEVM: process.env.POLYGONZKEVM_KEY,
      linea: process.env.LINEASCAN_API_KEY,
    },
    customChains: [
      {
        network: "scroll",
        chainId: 534352,
        urls: {
          apiURL: "https://api.scrollscan.com/api",
          browserURL: "https://scrollscan.com/",
        },
      },
      {
        network: "polygonZKEVM",
        chainId: 1101,
        urls: {
          apiURL: "https://api-zkevm.polygonscan.com/api",
          browserURL: "https://zkevm.polygonscan.com/",
        },
      },
      {
        network: "optimism-sepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io/",
        },
      },
      {
        network: "linea",
        chainId: 59144,
        urls: {
          apiURL: "https://api.lineascan.build/api",
          browserURL: "https://lineascan.build/",
        },
      },
    ],
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true,
  },
};
