// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');
const { saveRedpacketDeployment, verifyContract } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());



  const redPacketFactory = await ethers.getContractFactory('HappyRedPacket');
  const redPacket = await redPacketFactory.deploy();
  await redPacket.deployed();

  console.log('RedPacket address:', redPacket.address);

  const groth16VerifierFactory = await ethers.getContractFactory('Groth16Verifier');
  const groth16Verifier = await groth16VerifierFactory.deploy();
  await groth16Verifier.deployed();
  console.log('Groth16Verifier address:', groth16Verifier.address);


  // Init red packet
  let initRecipt = await redPacket.initialize(groth16Verifier.address, {
    // sometimes it will be fail if not
    gasLimit: 1483507
  });
  await initRecipt.wait();

  // save contract address to file
  saveRedpacketDeployment({
    redPacketAddress: redPacket.address,
    redPacketOwner: deployer.address,
  })

  console.log('Init HappyRedPacket successfully');

  // verify contract
  await verifyContract("redPacketAddress");
 
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
