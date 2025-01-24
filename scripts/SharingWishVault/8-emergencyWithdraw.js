const { ethers } = require("hardhat");
const path = require("path");
const { readDeployment } = require("./utils");
const { getRoles } = require("./roles");

async function main() {
  // Get roles
  const { admin } = await getRoles();
  console.log("Emergency withdrawing with admin account:", admin.address);

  // Read deployed contract addresses
  const deploymentPath = path.join(
    __dirname,
    "./deployment.optimism-sepolia.json",
  );
  const deployment = await readDeployment(deploymentPath);
  if (
    !deployment ||
    !deployment.SharingWishVault ||
    !deployment.currentVaultId
  ) {
    throw new Error(
      "Required contract addresses or vault ID not found in deployment file",
    );
  }

  // Get contract instance
  const vault = await ethers.getContractAt(
    "SharingWishVault",
    deployment.SharingWishVault,
    admin,
  );

  // Parameters
  const vaultId = deployment.currentVaultId;

  // Check emergency mode
  const isEmergencyMode = await vault.emergencyMode();
  if (!isEmergencyMode) {
    console.log("Setting emergency mode to true...");
    const setEmergencyTx = await vault.setEmergencyMode(true);
    await setEmergencyTx.wait();
    console.log("Emergency mode activated");
  }

  // Get vault info
  const vaultInfo = await vault.vaultById(vaultId);
  console.log(
    "Vault total amount:",
    ethers.formatUnits(vaultInfo.totalAmount, 18),
    "tokens",
  );

  // Emergency withdraw
  console.log("Emergency withdrawing from vault", vaultId);
  const tx = await vault.emergencyWithdraw(vaultId);
  const receipt = await tx.wait();

  // Find FundsWithdrawn event
  const event = receipt.logs.find(
    (log) => log.fragment && log.fragment.name === "FundsWithdrawn",
  );

  if (event) {
    const [eventVaultId, withdrawer, token, withdrawnAmount] = event.args;
    console.log("Emergency withdrawal successful!");
    console.log("Vault ID:", eventVaultId.toString());
    console.log("Withdrawer:", withdrawer);
    console.log("Token:", token);
    console.log("Amount:", ethers.formatUnits(withdrawnAmount, 18));

    // Turn off emergency mode
    console.log("Setting emergency mode back to false...");
    const unsetEmergencyTx = await vault.setEmergencyMode(false);
    await unsetEmergencyTx.wait();
    console.log("Emergency mode deactivated");
  } else {
    console.log(
      "Emergency withdrawal transaction successful, but couldn't find FundsWithdrawn event",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
