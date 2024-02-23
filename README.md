# Official-website-smart-contract

## support network

optimism , arbi , zksync ,scroll

## build

```sh
npx hardhat  compile

npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network sepolia

npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network scroll

npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network arbitrum

npm run format
or
npx prettier --write --plugin=prettier-plugin-solidity 'contracts/**/*.sol'


npx hardhat verify --network arbitrum 0x075FE5D2CD5D22D744Da94d81658143abf49D589
npx hardhat verify --network scroll 0xC90D844679C0eFEB37522c43711D4856d192BD62

```
