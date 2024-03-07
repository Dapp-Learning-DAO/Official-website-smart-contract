import { deployContract } from "./utils";
const { ethers } = require("hardhat");

// An example of a basic deploy script
// It will deploy a Greeter contract to selected network
// as well as verify it on Block Explorer if possible for the network
export default async function () {
  const redPacket = await deployContract("HappyRedPacket");

  const groth16Verifier = await deployContract("Groth16Verifier");

  console.log("Groth16Verifier address:", groth16Verifier.address);

  let initRecipt = await redPacket.initialize(groth16Verifier.address);

  await initRecipt.wait();
}
