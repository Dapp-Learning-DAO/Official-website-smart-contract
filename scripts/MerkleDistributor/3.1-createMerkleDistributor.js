// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
//eg. npx hardhat run scripts/MerkleDistributor/3.1-createMerkleDistributor.js --network mumbaiTest
const { ethers } = require("hardhat");
require("dotenv").config();
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const {
  readMerkleDistributorDeployment,
  saveMerkleDistributorDeployment,
} = require("./merkleDistributorUtils");
const claimerList = require("./claimerList.json");
const BalanceTree = require("../../test/balance-tree.js");

// sleep function
let endSleep = false;
async function sleep() {
  for (let i = 0; i < 500; i++) {
    if (endSleep) break;
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
  }
  if (!endSleep) console.log(`\nhad slept too long, but no result...`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployment = readMerkleDistributorDeployment();

  const merkleDistributorFactoryAddress =
    deployment.merkleDistributorFactoryAddress;
  const simpleTokenAddress = deployment.simpleTokenAddress;

  const merkleDistributorFactory = await ethers.getContractAt(
    "MerkleDistributorFactory",
    merkleDistributorFactoryAddress,
    deployer,
  );
  const simpleToken = await ethers.getContractAt(
    "SimpleToken",
    simpleTokenAddress,
    deployer,
  );

  let balances = new Array();
  for (const [key, value] of Object.entries(claimerList)) {
    balances.push({ account: key, amount: value });
  }
  let merkleTree = new BalanceTree(balances);
  let merkleTreeRoot = merkleTree.getHexRoot();
  console.log("merkleTree Root:", merkleTreeRoot);

  // create_merkle_distributor
  let number = Object.keys(claimerList).length;
  let message = `Hi${Date.now()}`;
  let name = "cache";
  let tokenAddress = simpleTokenAddress;
  let totalTokens = Object.values(claimerList).reduce(
    (acc, val) => acc + val,
    0,
  );
  let duration = 259200;
  let params = [
    number,
    message,
    name,
    tokenAddress,
    totalTokens,
    merkleTreeRoot,
    duration,
  ];

  // merkleDistributorFactory.once('DistributorCreated', (totalTokens, id, name, message, token_address, number, duration, creator, creation_time) => {
  //   endSleep = true;
  // saveMerkleDistributorDeployment({ [id]: `${token_address}=>${totalTokens.toString()}` });
  //   console.log(`CreationSuccess Event, totalTokens: ${totalTokens.toString()}\tMerkleDistributorId: ${id}  `);
  // });

  let tx = await simpleToken.approve(
    merkleDistributorFactoryAddress,
    totalTokens,
  );
  await tx.wait();

  console.log("Approve Successfully");

  let createDistributorRecipt =
    await merkleDistributorFactory.createDistributor(...params, {
      // sometimes it will be fail if not specify the gasLimit
      // gasLimit: 1483507
    });
  await createDistributorRecipt.wait();

  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 6000);
  });

  //query
  let id = ethers.solidityPackedKeccak256(
    ["address", "string"],
    [deployer.address, message],
  );
  let distributorErc20Address =
    await merkleDistributorFactory.redpacket_by_id(id);
  saveMerkleDistributorDeployment({
    MerkleDistributor: distributorErc20Address,
  });
  console.log(
    `CreationSuccess, totalTokens: ${totalTokens.toString()}\tMerkleDistributorId: ${id}  distributorErc20Address:${distributorErc20Address}`,
  );

  console.log("Create MerkleDistributor successfully");

  // await sleep();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
