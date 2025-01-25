const { ethers } = require("hardhat");
const path = require("path");
const { readDeployment, saveVaultRecord } = require("./utils");
const { getRoles } = require("./roles");

async function main() {
  const network = hre.network.name;

  // Get roles
  const { admin } = await getRoles();
  console.log("Creating vault with admin account:", admin.address);

  // Read deployed contract addresses
  const deploymentPath = path.join(
    __dirname,
    "./deployment.optimism-sepolia.json",
  );
  const deployment = await readDeployment(deploymentPath);
  if (!deployment || !deployment.SharingWishVault) {
    throw new Error(
      "SharingWishVault contract address not found in deployment file",
    );
  }

  // Get contract instances
  const vault = await ethers.getContractAt(
    "SharingWishVault",
    deployment.SharingWishVault,
    admin,
  );
  const mockToken = await ethers.getContractAt(
    "SimpleToken",
    deployment.MockERC20,
    admin,
  );

  // Create vault parameters
  const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
  const token = deployment.MockERC20;
  const lockDuration = 3 * 24 * 60 * 60; // 3 days in seconds
  const donateAmount = ethers.parseUnits("100", 18); // 100 tokens with 18 decimals

  // If donating ERC20 tokens, approve first
  if (
    donateAmount > 0 &&
    token !== "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
  ) {
    console.log("Approving tokens for initial donation...");
    const approveTx = await mockToken.approve(
      deployment.SharingWishVault,
      donateAmount,
    );
    await approveTx.wait();
    console.log("Tokens approved");
  }

  // Create vault
  console.log("Creating vault with parameters:");
  console.log("- Message:", message);
  console.log("- Token:", token);
  console.log("- Lock Duration:", lockDuration, "seconds");
  console.log(
    "- Initial Donation:",
    ethers.formatUnits(donateAmount, 18),
    "tokens",
  );

  const tx = await vault.createVault(
    message,
    token,
    lockDuration,
    donateAmount,
  );
  const receipt = await tx.wait();

  // Find VaultCreated event
  const event = receipt.logs.find(
    (log) => log.fragment && log.fragment.name === "VaultCreated",
  );

  if (event) {
    const [vaultId] = event.args;
    console.log("Vault created successfully!");
    console.log("Vault ID:", vaultId.toString());

    // Save vault info to vault records
    await saveVaultRecord(network, vaultId.toString(), {
      message,
      token,
      lockDuration,
      creator: admin.address,
      createdAt: Math.floor(Date.now() / 1000),
      txHash: tx.hash,
    });

    console.log("Vault record saved successfully");
  } else {
    console.log(
      "Vault creation transaction successful, but couldn't find VaultCreated event",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
