# Official-website-smart-contract

## support network

optimism , arbi , zksync ,scroll, polygonzkevm

## build

```sh
npx hardhat  compile

npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network sepolia

npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network scroll

npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network arbitrum

npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network polygonZKEVM


npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network linea


// distributor
npx hardhat run scripts/redpacket/2-deployMerkleDistributorFactory.js --network arbitrum

npx hardhat run scripts/MerkleDistributor/2-deployMerkleDistributorFactory.js --network polygonZKEVM

npm run format
or
npx prettier --write --plugin=prettier-plugin-solidity 'contracts/**/*.sol'


npx hardhat verify --network arbitrum 0x075FE5D2CD5D22D744Da94d81658143abf49D589
npx hardhat verify --network scroll 0xC90D844679C0eFEB37522c43711D4856d192BD62

```

## DEPLOYMENT

for more details see [DEPLOYMENT.md](./DEPLOYMENT.md).
