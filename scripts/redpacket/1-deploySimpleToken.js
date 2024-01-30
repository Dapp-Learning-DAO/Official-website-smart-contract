// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers,network } = require('hardhat');
const { saveRedpacketDeployment,verifyContract} = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  // console.log('Account balance:', (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory('SimpleToken');
  const token = await Token.deploy('DappLearning Test Token', 'DLD', 1, 1000000);
  await token.deployed();

  console.log('Token address:', token.address);

  let balance = await token.balanceOf(deployer.address);
  console.log(`balance of deployer ${balance.toString()}`);

  saveRedpacketDeployment({
    simpleTokenAddress: token.address,
  });

  // verify contract
  await verifyContract("simpleTokenAddress",network.name,['DappLearning', 'DL', 1, 1000000]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
