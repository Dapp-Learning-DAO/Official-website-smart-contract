// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers, network } = require("hardhat");
const {
  deployContract,
  saveRedpacketDeployment,
  verifyContract,
} = require("../../utils");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // console.log('Account balance:', (await deployer.getBalance()).toString());

  const token = await deployContract(
    "SimpleToken",
    ["WETH", "WETH", 18, 100],
    deployer,
  );

  console.log("Token address:", token.address);

  let balance = await token.balanceOf(deployer.address);
  console.log(`balance of deployer ${balance.toString()}`);

  saveRedpacketDeployment({
    WETHAddress: token.address,
  });

  // verify contract
  await verifyContract("WETHAddress", network.name, ["WETH", "WETH", 18, 100]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
