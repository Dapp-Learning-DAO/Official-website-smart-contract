// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
//eg. npx hardhat run scripts/MerkleDistributor/2-deployMerkleDistributorFactory.js --network mumbaiTest

const { ethers } = require("hardhat");
const {
  saveMerkleDistributorDeployment,
  verifyContract,
} = require("./merkleDistributorUtils");
const { deployContract } = require("../../utils");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // console.log('Account balance:', (await deployer.getBalance()).toString());

  const DistributorFactory = await ethers.getContractFactory(
    "MerkleDistributorFactory",
  );
  const distributorFactory = await DistributorFactory.deploy();
  await distributorFactory.waitForDeployment();

  console.log("distributorFactory address:", distributorFactory.target);

  // save contract address to file
  saveMerkleDistributorDeployment({
    merkleDistributorFactoryAddress: distributorFactory.target,
    merkleDistributorFactoryOwner: deployer.address,
  });

  console.log("Init HappyRedPacket successfully");

  // verify contract
  await verifyContract("merkleDistributorFactoryAddress");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
