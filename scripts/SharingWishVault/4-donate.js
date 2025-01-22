const { ethers } = require("hardhat");
const path = require("path");
const {
  readDeployment,
  readVaultRecord,
  getLatestVaultId,
  saveVaultRecord,
} = require("./utils");
const { getRoles } = require("./roles");

ERC20_address = "";

async function main() {
  const network = hre.network.name;

  // Get roles
  const { donor, admin } = await getRoles();
  console.log("Donating with donor account:", donor.address);

  // Read deployed contract addresses
  const deploymentPath = path.join(
    __dirname,
    "./deployment.optimism-sepolia.json",
  );
  const deployment = await readDeployment(deploymentPath);
  // test token
  ERC20_address = deployment.MockERC20;
  if (!deployment || !deployment.SharingWishVault || !ERC20_address) {
    throw new Error("Required contract addresses not found in deployment file");
  }

  // Get latest vault ID
  const vaultId = await getLatestVaultId(network);
  if (vaultId === -1) {
    throw new Error("No vaults found in records");
  }
  console.log("Using latest vault ID:", vaultId);

  // Get contract instances
  const vault = await ethers.getContractAt(
    "SharingWishVault",
    deployment.SharingWishVault,
    donor,
  );
  const mockToken = await ethers.getContractAt(
    "SimpleToken",
    deployment.MockERC20,
    donor,
  );

  // Parameters
  const amount = ethers.parseUnits("100", 18); // Donate 100 tokens

  // Check donor balance
  const balance = await mockToken.balanceOf(donor.address);
  console.log("donor balance:", ethers.formatUnits(balance, 18), "tokens");

  if (balance < amount) {
    throw new Error("donor doesn't have enough tokens to donate");
  }

  // Check current allowance
  const currentAllowance = await mockToken.allowance(
    donor.address,
    deployment.SharingWishVault,
  );
  console.log(
    "Current allowance:",
    ethers.formatUnits(currentAllowance, 18),
    "tokens",
  );

  // Check vault token
  const vaultInfo = await vault.vaults(vaultId);
  console.log("Vault token:", vaultInfo.token);
  console.log("Expected token:", deployment.MockERC20);

  // Approve tokens
  console.log("Approving tokens...");
  const approveTx = await mockToken.approve(
    deployment.SharingWishVault,
    amount,
  );
  await approveTx.wait();
  console.log("Tokens approved");

  // Donate
  console.log("Donating to vault", vaultId);
  console.log("Amount:", ethers.formatUnits(amount, 18), "tokens");

  const tx = await vault.donate(vaultId, amount);
  const receipt = await tx.wait();

  // Find FundsDonated event
  const event = receipt.logs.find(
    (log) => log.fragment && log.fragment.name === "FundsDonated",
  );

  if (event) {
    const [eventVaultId, donor, token, donatedAmount] = event.args;
    console.log("Donation successful!");
    console.log("Vault ID:", eventVaultId.toString());
    console.log("Donor:", donor);
    console.log("Token:", token);
    console.log("Amount:", ethers.formatUnits(donatedAmount, 18));

    // Update vault record with donation
    const records = await readVaultRecord();
    const vaultRecord = records.vaults[network][vaultId];

    if (!vaultRecord.donations) {
      vaultRecord.donations = [];
    }

    vaultRecord.donations.push({
      donor: donor,
      amount: donatedAmount.toString(),
      txHash: tx.hash,
      timestamp: Math.floor(Date.now() / 1000),
    });

    await saveVaultRecord(network, vaultId, vaultRecord);
    console.log("Vault record updated with donation");
  } else {
    console.log(
      "Donation transaction successful, but couldn't find FundsDonated event",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
