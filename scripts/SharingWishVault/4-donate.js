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

  // Check if vault exists and get its info
  const vaultInfo = await vault.vaultById(vaultId);
  if (vaultInfo.creator === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Vault ${vaultId} does not exist`);
  }
  console.log("Vault creator:", vaultInfo.creator);
  console.log("Vault token:", vaultInfo.token);
  console.log("Expected token:", deployment.MockERC20);

  // Check if vault token matches expected token
  if (vaultInfo.token !== deployment.MockERC20) {
    throw new Error(
      `Vault token (${vaultInfo.token}) does not match expected token (${deployment.MockERC20})`,
    );
  }

  // Get contract instances
  const mockToken = await ethers.getContractAt(
    "MockERC20",
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

  const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const isETH = vaultInfo.token === ETH_ADDRESS;

  let tx;
  let receipt;

  if (isETH) {
    // Donate ETH
    console.log("Donating ETH to vault", vaultId);
    console.log("Amount:", ethers.formatUnits(amount, 18), "ETH");

    tx = await vault.donate(vaultId, amount, {
      value: amount,
    });
    receipt = await tx.wait();
  } else {
    // For ERC20, use permit
    console.log("Using permit for ERC20 donation");
    const deadline = ethers.MaxUint256;

    // Get the current nonce for the donor
    const nonce = await mockToken.nonces(donor.address);
    console.log("Current nonce:", nonce);

    // Get the domain separator
    const domainSeparator = await mockToken.DOMAIN_SEPARATOR();
    console.log("Domain separator:", domainSeparator);

    // Create the permit signature
    const permitData = {
      owner: donor.address,
      spender: deployment.SharingWishVault,
      value: amount,
      nonce: nonce,
      deadline: deadline,
    };

    // Sign the permit
    const signature = await donor.signTypedData(
      // Domain
      {
        name: await mockToken.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: deployment.MockERC20,
      },
      // Types
      {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      permitData,
    );

    const { v, r, s } = ethers.Signature.from(signature);

    console.log("Donating to vault", vaultId);
    console.log("Amount:", ethers.formatUnits(amount, 18), "tokens");
    console.log("Using permit with deadline:", deadline);

    // Donate with permit
    tx = await vault.donateWithPermit(vaultId, amount, deadline, v, r, s);
    receipt = await tx.wait();
  }

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
