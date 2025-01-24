const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  console.log("Starting MockERC20 deployment...");

  const initArgs = [
    "DappLearning Test Token", // name
    "DLT", // symbol
    18, // decimals
    1000000, // initial supply (1 million tokens)
  ];

  const mockToken = await MockERC20.deploy(...initArgs);

  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();

  console.log("MockERC20 deployed to:", mockTokenAddress);

  // Save deployment information
  const deploymentInfo = {
    MockERC20: mockTokenAddress,
  };

  // Save deployment info based on network name
  const deploymentPath = path.join(
    __dirname,
    `deployment.${hre.network.name}.json`,
  );
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("Deployment info saved to:", deploymentPath);

  // If not on a local network, wait for verification and verify contract
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations before verification...");
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

    await hre.run("verify:verify", {
      address: mockTokenAddress,
      constructorArguments: initArgs,
    });
    console.log("Contract verified on block explorer");
  }

  console.log("MockERC20 deployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  });
