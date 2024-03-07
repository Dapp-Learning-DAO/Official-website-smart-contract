# Official-website-smart-contract

## support network

optimism , arbi , zksync ,scroll

## build

```sh
npx hardhat  compile

npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network sepolia

npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network scroll

npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network arbitrum


// distributor
npx hardhat run scripts/redpacket/2-deployHappyRedPacket.js --network arbitrum



npm run format
or
npx prettier --write --plugin=prettier-plugin-solidity 'contracts/**/*.sol'


npx hardhat verify --network arbitrum 0x075FE5D2CD5D22D744Da94d81658143abf49D589
npx hardhat verify --network scroll 0xC90D844679C0eFEB37522c43711D4856d192BD62

```

## distributor

op:
0xCaEC4528A60ca2c47123D7946179011F8B7A7b41

arbi:
0xF5D3668d94dcF4C2cB7bE81AD43857762695BF78

scroll: 0x35eca762d594e734e58Fa2838EAA61A359606289
