const { ethers } = require("hardhat");
const path = require("path");
const {
  readDeployment,
  readVaultRecord,
  getLatestVaultId,
  saveVaultRecord,
} = require("./utils");
const { getRoles } = require("./roles");

async function main() {
  const network = hre.network.name;

  // Get roles
  const { admin, claimer } = await getRoles();
  console.log("Settling vault with admin account:", admin.address);
  console.log("Setting claimer as:", claimer.address);

  // Read deployed contract addresses
  const deploymentPath = path.join(
    __dirname,
    "./deployment.optimism-sepolia.json",
  );
  const deployment = await readDeployment(deploymentPath);
  if (!deployment || !deployment.SharingWishVault) {
    throw new Error("Required contract addresses not found in deployment file");
  }

  // Get latest vault ID
  const vaultId = await getLatestVaultId(network);
  if (vaultId === -1) {
    throw new Error("No vaults found in records");
  }
  console.log("Using latest vault ID:", vaultId);

  // Get contract instance
  const vault = await ethers.getContractAt(
    "SharingWishVault",
    deployment.SharingWishVault,
    admin,
  );

  // Get vault info before settling
  const vaultInfo = await vault.vaults(vaultId);
  console.log(
    "Vault total amount:",
    ethers.formatUnits(vaultInfo.totalAmount, 18),
    "tokens",
  );

  // Parameters
  const amount = ethers.parseUnits("50", 18); // Settle 50 tokens
  const autoClaim = false; // Set to true to automatically claim after settling

  // Settle vault
  console.log("Settling vault", vaultId);
  console.log("Claimer:", claimer.address);
  console.log("Amount:", ethers.formatUnits(amount, 18), "tokens");
  console.log("Auto claim:", autoClaim);

  const tx = await vault.settle(vaultId, claimer.address, amount, autoClaim);
  const receipt = await tx.wait();

  // Find VaultSettled event
  const event = receipt.logs.find(
    (log) => log.fragment && log.fragment.name === "VaultSettled",
  );

  if (event) {
    const [eventVaultId, eventClaimer, token, settledAmount] = event.args;
    console.log("Vault settled successfully!");
    console.log("Vault ID:", eventVaultId.toString());
    console.log("Claimer:", eventClaimer);
    console.log("Token:", token);
    console.log("Amount:", ethers.formatUnits(settledAmount, 18));

    // Update vault record with settlement
    const records = await readVaultRecord();
    const vaultRecord = records.vaults[network][vaultId];

    if (!vaultRecord.settlements) {
      vaultRecord.settlements = [];
    }

    vaultRecord.settlements.push({
      claimer: eventClaimer,
      amount: settledAmount.toString(),
      txHash: tx.hash,
      timestamp: Math.floor(Date.now() / 1000),
    });

    await saveVaultRecord(network, vaultId, vaultRecord);
    console.log("Vault record updated with settlement");
  } else {
    console.log(
      "Settlement transaction successful, but couldn't find VaultSettled event",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
