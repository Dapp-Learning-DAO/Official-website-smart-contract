const { ethers } = require("hardhat");
const path = require("path");
const { readDeployment } = require("./utils");
const { getRoles } = require("./roles");

async function main() {
  const network = hre.network.name;

  // Get roles
  const { admin } = await getRoles();
  console.log("Adding allowed token with admin account:", admin.address);

  // Read deployed contract addresses
  const deploymentPath = path.join(
    __dirname,
    "./deployment.optimism-sepolia.json",
  );
  const deployment = await readDeployment(deploymentPath);
  if (!deployment || !deployment.SharingWishVault || !deployment.MockERC20) {
    throw new Error("Required contract addresses not found in deployment file");
  }

  const sharingVaultAddress = deployment.SharingWishVault;
  const mockTokenAddress = deployment.MockERC20;

  // Get contract instance
  const vault = await ethers.getContractAt(
    "SharingWishVault",
    sharingVaultAddress,
    admin,
  );
  const mockToken = await ethers.getContractAt(
    "SimpleToken",
    mockTokenAddress,
    admin,
  );

  // Check if token is already allowed
  const isAllowed = await vault.isAllowedToken(mockTokenAddress);
  if (isAllowed) {
    console.log("Token is already allowed:", mockTokenAddress);
    return;
  }

  // Add token to allowed list
  console.log("Adding token to allowed list:", mockTokenAddress);
  const tx = await vault.addAllowedToken(mockTokenAddress);
  await tx.wait();

  // Verify token is now allowed
  const isNowAllowed = await vault.isAllowedToken(deployment.MockERC20);
  if (isNowAllowed) {
    console.log("Token successfully added to allowed list");
    console.log("Token:", deployment.MockERC20);
    console.log("Transaction hash:", tx.hash);
  } else {
    throw new Error("Failed to add token to allowed list");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
