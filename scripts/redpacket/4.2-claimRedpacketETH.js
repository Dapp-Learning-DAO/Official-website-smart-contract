// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require("dotenv").config();
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const { readRedpacketDeployment, hashToken } = require("../../utils");
const claimerList = require("./claimerList.json");

async function main() {
  const [deployer, user1, user2] = await ethers.getSigners();
  const deployment = readRedpacketDeployment();

  const HappyRedPacketAddress = deployment.redPacketAddress;
  let redpacketID = deployment.redPacketID;

  let redPacket = await ethers.getContractAt(
    "HappyRedPacket",
    HappyRedPacketAddress,
    deployer,
  );

  let merkleTree = new MerkleTree(
    claimerList.map((user) => hashToken(user)),
    keccak256,
    { sortPairs: true },
  );

  async function cliamRedPacket(user) {
    console.log(user.address);
    console.log(hashToken(user.address));
    let proof = merkleTree.getHexProof(hashToken(user.address));
    console.log("merkleTree proof: ", proof);

    const balanceBefore = await ethers.provider.getBalance(deployer.address);

    let createRedPacketRecipt = await redPacket
      .connect(user)
      .claimOrdinaryRedpacket(redpacketID, proof);
    await createRedPacketRecipt.wait();

    const balanceAfter = await ethers.provider.getBalance(deployer.address);
    console.log(
      `user ${user.address} has claimd ${balanceAfter - balanceBefore}`,
    );
  }

  console.log("\n=========Begin to claim Red Packet=========\n");

  await cliamRedPacket(deployer);

  console.log("\n=========Claim Red Packet successfully=========\n");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
