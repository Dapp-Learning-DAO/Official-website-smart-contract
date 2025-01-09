const { ethers } = require("hardhat");

async function getRoles() {
  const signers = await ethers.getSigners();
  return {
    admin: signers[0], // PRIVATE_KEY - Contract deployer and admin
    donor: signers[1], // PRIVATE_KEY1 - User who donates to the vault
    claimer: signers[2], // PRIVATE_KEY2 - User who claims from the vault
  };
}

module.exports = {
  getRoles,
};
