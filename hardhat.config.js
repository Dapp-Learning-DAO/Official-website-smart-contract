require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require('@nomicfoundation/hardhat-verify');

require("dotenv").config();

const settings = {
  optimizer: {
    enabled: true,
    runs: 200,
  },
};
function mnemonic() {
  return [
    process.env.PRIVATE_KEY,
    process.env.PRIVATE_KEY1,
    process.env.PRIVATE_KEY2,
  ];
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
    ropsten: {
      url: "https://ropsten.infura.io/v3/" + process.env.INFURA_ID, //<---- YOUR INFURA ID! (or it won't work)
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
    optim: {
      url: "https://optimism-mainnet.infura.io/v3/" + process.env.INFURA_ID,
      accounts: mnemonic(),
    },
    Sepolia: {
      url: "https://sepolia.infura.io/v3/" + process.env.INFURA_ID,
      accounts: mnemonic(),
    },
  },
  etherscan: {
    apiKey: process.env.EHTERSCAN_KEY,
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true
  }
};
