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
  const { admin } = await getRoles();
  console.log("Withdrawing with admin account:", admin.address);

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

  // Get vault info
  const vaultInfo = await vault.vaults(vaultId);
  const currentTime = Math.floor(Date.now() / 1000);
  const lockEndTime = Number(vaultInfo.lockTime);
  const remainingTime = lockEndTime - currentTime;

  console.log("Vault info:");
  console.log(
    "- Total amount:",
    ethers.formatUnits(vaultInfo.totalAmount, 18),
    "tokens",
  );
  console.log(
    "- Lock end time:",
    new Date(lockEndTime * 1000).toLocaleString(),
  );
  console.log("- Current time:", new Date(currentTime * 1000).toLocaleString());

  if (remainingTime > 0) {
    const days = Math.floor(remainingTime / (24 * 60 * 60));
    const hours = Math.floor((remainingTime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remainingTime % (60 * 60)) / 60);
    console.log(
      `Lock period not expired. Time remaining: ${days} days, ${hours} hours, ${minutes} minutes`,
    );
    return;
  }

  // Withdraw
  console.log("Withdrawing from vault", vaultId);
  try {
    const tx = await vault.withdraw(vaultId);
    const receipt = await tx.wait();

    // Find FundsWithdrawn event
    const event = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "FundsWithdrawn",
    );

    if (event) {
      const [eventVaultId, withdrawer, token, withdrawnAmount] = event.args;
      console.log("Withdrawal successful!");
      console.log("Vault ID:", eventVaultId.toString());
      console.log("Withdrawer:", withdrawer);
      console.log("Token:", token);
      console.log("Amount:", ethers.formatUnits(withdrawnAmount, 18));

      // Update vault record with withdrawal
      const records = await readVaultRecord();
      const vaultRecord = records.vaults[network][vaultId];

      if (!vaultRecord.withdrawals) {
        vaultRecord.withdrawals = [];
      }

      vaultRecord.withdrawals.push({
        withdrawer: withdrawer,
        amount: withdrawnAmount.toString(),
        txHash: tx.hash,
        timestamp: Math.floor(Date.now() / 1000),
      });

      await saveVaultRecord(network, vaultId, vaultRecord);
      console.log("Vault record updated with withdrawal");
    } else {
      console.log(
        "Withdrawal transaction successful, but couldn't find FundsWithdrawn event",
      );
    }
  } catch (error) {
    if (error.message.includes("LockPeriodNotExpired")) {
      console.log("Error: Lock period has not expired yet");
      console.log(`Time remaining: ${remainingTime} seconds`);
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
