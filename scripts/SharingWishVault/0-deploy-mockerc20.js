const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");
const { waitForConfirmations, saveDeployment } = require("./utils");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MockERC20 with account:", deployer.address);

  // Deploy MockERC20
  const initArgs = ["DappLearning Test Token", "DLT", 18, 1000000];
  const MockERC20 = await ethers.getContractFactory("SimpleToken");
  const mockERC20 = await MockERC20.deploy(...initArgs);
  await mockERC20.waitForDeployment();

  const mockERC20Address = await mockERC20.getAddress();
  console.log("MockERC20 deployed to:", mockERC20Address);

  // If we're on a network that supports verification, wait for confirmations
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for 3 block confirmations before verification...");
    await waitForConfirmations(
      ethers.provider,
      mockERC20.deploymentTransaction().hash,
      3,
    );

    console.log("MockERC20 address:", mockERC20Address);

    await saveDeployment(
      { MockERC20: mockERC20Address },
      path.join(__dirname, "./deployment." + network.name + ".json"),
    );

    await hre.run("verify:verify", {
      address: mockERC20Address,
      constructorArguments: initArgs,
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
