// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
//eg. npx hardhat run scripts/MerkleDistributor/1-deploySimpleToken.js --network mumbaiTest
const { ethers } = require("hardhat");
const { saveMerkleDistributorDeployment } = require("./merkleDistributorUtils");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // console.log('Account balance:', (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory("SimpleToken");
  const token = await Token.deploy("DappLearning", "DL", 1, 1000000);
  await token.waitForDeployment();

  console.log("Token address:", token.target);

  let balance = await token.balanceOf(deployer.address);
  console.log(`balance of deployer ${balance.toString()}`);

  saveMerkleDistributorDeployment({
    simpleTokenAddress: token.target,
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
