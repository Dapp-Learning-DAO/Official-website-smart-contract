// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require("dotenv").config();
const { ethers } = require("hardhat");
const { encodePacked, keccak256 } = require("viem");
const { MerkleTree } = require("merkletreejs");
const { readRedpacketDeployment, hashToken } = require("../../utils");
const claimerList = require("./claimerList.json");

async function main() {
  const [deployer, user1, user2] = await ethers.getSigners();
  const deployment = readRedpacketDeployment();

  const HappyRedPacketAddress = deployment.redPacketAddress;
  let redpacketID = deployment.redPacketID;
  let simpleToken = await ethers.getContractAt(
    "SimpleToken",
    deployment.simpleTokenAddress,
    deployer,
  );
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
    let proof = merkleTree.getHexProof(hashToken(user.address));
    console.log("merkleTree proof: ", proof);

    const balanceBefore = await simpleToken.balanceOf(user.address);

    let createRedPacketRecipt = await redPacket
      .connect(user)
      .claimOrdinaryRedpacket(redpacketID, proof);
    await createRedPacketRecipt.wait();

    const balanceAfter = await simpleToken.balanceOf(user.address);
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
