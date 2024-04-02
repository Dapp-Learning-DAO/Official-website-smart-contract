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

## redpacket

polygonzkevm:
RedPacket address: 0x142160aeC49EF40a338B41c9aEd49f3dCE54C7C1
Groth16Verifier address: 0x442b21f765b2a1830e8e0F7D10F69F728B00Cc9F

linea:
RedPacket address: 0x142160aeC49EF40a338B41c9aEd49f3dCE54C7C1
Groth16Verifier address: 0x442b21f765b2a1830e8e0F7D10F69F728B00Cc9F

## distributor

op:
0xCaEC4528A60ca2c47123D7946179011F8B7A7b41

arbi:
0xF5D3668d94dcF4C2cB7bE81AD43857762695BF78

scroll: 0x35eca762d594e734e58Fa2838EAA61A359606289

polygonzkevm: 0x075FE5D2CD5D22D744Da94d81658143abf49D589

linea: 0x075FE5D2CD5D22D744Da94d81658143abf49D589
