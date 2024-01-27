// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
//eg. npx hardhat run scripts/MerkleDistributor/4-claimMerkleDistributor.js --network mumbaiTest
const { ethers } = require('hardhat');
require('dotenv').config();
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { readMerkleDistributorDeployment } = require('./merkleDistributorUtils');
const claimerList = require('./claimerList.json');
const BalanceTree = require('../../test/balance-tree.js');


function catchClaimerByAddress(address) {
  let keys = Object.keys(claimerList);
  let index = keys.indexOf(address);
  let amount = claimerList[address];
  return  { account: address, amount: amount, index: index }
}



async function main() {
  const [deployer, user1, user2] = await ethers.getSigners();
  const deployment = readMerkleDistributorDeployment();

  const merkleDistributorAddress = "0x5CBE96445F2de87f396018306cA30d3b7799E7c2";//read from deployment.json
  const simpleToken = await ethers.getContractAt('SimpleToken', deployment.simpleTokenAddress, deployer);
  const merkleDistributor = await ethers.getContractAt('MerkleDistributor', merkleDistributorAddress, deployer);


  let balances = new Array();
  for (const [key, value] of Object.entries(claimerList)) {
    balances.push({ account: key, amount: value });
  }
  let merkleTree = new BalanceTree(balances);
  let merkleTreeRoot = merkleTree.getHexRoot();
  console.log('merkleTree Root:', merkleTreeRoot);


  async function claimMerkleDistributor(user) {
    let claimerData = catchClaimerByAddress(user.address);
    const proof = merkleTree.getProof(claimerData.index, user.address, claimerData.amount);
    console.log('merkleTree proof: ', proof);

    const balanceBefore = await simpleToken.balanceOf(user.address);

    let createRedPacketRecipt = await merkleDistributor.connect(user).claim(claimerData.index, claimerData.amount, proof);
    await createRedPacketRecipt.wait();

    const balanceAfter = await simpleToken.balanceOf(user.address);
    console.log(`user ${user.address} has claimd ${balanceAfter.sub(balanceBefore)}`);
  }

  console.log("\n=========Begin to claim Red Packet=========\n")

  await claimMerkleDistributor(deployer);

  console.log('\n=========Claim Red Packet successfully=========\n');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
