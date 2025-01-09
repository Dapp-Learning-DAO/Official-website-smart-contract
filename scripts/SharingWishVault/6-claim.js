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
  const { claimer } = await getRoles();
  console.log("Claiming with claimer account:", claimer.address);

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
    claimer,
  );

  // Get claimable amount before claiming
  const claimableAmount = await vault.getMaxClaimableAmount(
    vaultId,
    claimer.address,
  );
  console.log(
    "Claimable amount:",
    ethers.formatUnits(claimableAmount, 18),
    "tokens",
  );

  if (claimableAmount <= 0) {
    throw new Error("No tokens available to claim");
  }

  // Claim
  console.log("Claiming from vault", vaultId);
  const tx = await vault.claim(vaultId);
  const receipt = await tx.wait();

  // Find FundsClaimed event
  const event = receipt.logs.find(
    (log) => log.fragment && log.fragment.name === "FundsClaimed",
  );

  if (event) {
    const [eventVaultId, eventClaimer, token, claimedAmount] = event.args;
    console.log("Claim successful!");
    console.log("Vault ID:", eventVaultId.toString());
    console.log("Claimer:", eventClaimer);
    console.log("Token:", token);
    console.log("Amount:", ethers.formatUnits(claimedAmount, 18));

    // Update vault record with claim
    const records = await readVaultRecord();
    const vaultRecord = records.vaults[network][vaultId];

    if (!vaultRecord.claims) {
      vaultRecord.claims = [];
    }

    vaultRecord.claims.push({
      claimer: eventClaimer,
      amount: claimedAmount.toString(),
      txHash: tx.hash,
      timestamp: Math.floor(Date.now() / 1000),
    });

    await saveVaultRecord(network, vaultId, vaultRecord);
    console.log("Vault record updated with claim");
  } else {
    console.log(
      "Claim transaction successful, but couldn't find FundsClaimed event",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
