const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

const newValidSigner = "";

async function main() {
  if (!ethers.isAddress(newValidSigner))
    throw `setValidSigner Error: please set a valid newValidSigner.`;
  const deploymentName = `deployment.${network.name}.json`;
  const deploymentDir = path.join(__dirname, deploymentName);
  if (!fs.existsSync(deploymentDir))
    throw `setValidSigner Error: ${deploymentDir} not exists, please deploy contract first.`;
  const deploymentJson = JSON.parse(
    fs.readFileSync(deploymentDir, { encoding: "utf-8" }),
  );
  const nftAddress = deploymentJson.DLWarcraft3NFT;
  const nft = (await ethers.getContractFactory("DLWarcraft3NFT")).attach(
    nftAddress,
  );

  console.log("old validSigner", await nft.validSigner());

  await (await nft.setValidSigner(newValidSigner)).wait();

  console.log("new validSigner", await nft.validSigner());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
