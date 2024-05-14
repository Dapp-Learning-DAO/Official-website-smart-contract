// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers, network } = require("hardhat");
const { deployContract, verifyContract } = require("../../utils");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const nftName = "DLWarcraft3NFT";
  const nftSymbol = "DLW3";
  const signerManager = deployer.address;
  const baseURL = "https://devapi.dapplearning.org/dlwarcraft?rank=";
  const nft = await deployContract("DLWarcraft3NFT", [
    nftName,
    nftSymbol,
    signerManager,
    baseURL,
  ]);

  console.log("DLWarcraft3NFT address:", nft.address);

  fs.writeFileSync(
    path.join(__dirname, `./deployment.${network.name}.json`),
    JSON.stringify({
      DLWarcraft3NFT: nft.address,
    }),
    { flag: "w+" },
  );

  // verify contract
  await verifyContract(nft.address, hre.network.name, [
    nftName,
    nftSymbol,
    signerManager,
    baseURL,
  ]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
