const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { waitForConfirmations, saveDeployment } = require("./utils");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SharingWishVault with account:", deployer.address);

  // Deploy SharingWishVault
  const SharingWishVault = await ethers.getContractFactory("SharingWishVault");
  const sharingWishVault = await SharingWishVault.deploy(deployer.address);
  await sharingWishVault.waitForDeployment();

  const sharingWishVaultAddress = await sharingWishVault.getAddress();
  console.log("SharingWishVault deployed to:", sharingWishVaultAddress);

  // If we're on a network that supports verification, wait for confirmations
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for 6 block confirmations before verification...");
    await waitForConfirmations(
      ethers.provider,
      sharingWishVault.deploymentTransaction().hash,
      6,
    );

    console.log("SharingWishVault address:", sharingWishVaultAddress);

    await saveDeployment(
      { SharingWishVault: sharingWishVaultAddress },
      path.join(__dirname, "./deployment." + network.name + ".json"),
    );

    await hre.run("verify:verify", {
      address: sharingWishVaultAddress,
      constructorArguments: [deployer.address],
    });
    console.log("Contract verified on Etherscan");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
