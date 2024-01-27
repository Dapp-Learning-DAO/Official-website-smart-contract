// read and save MerkleDistributor contract deployment json file
const path = require("path");
const fs = require("fs");

const DEPLOYMENGT_DIR = path.join(
  __dirname,
  "/deployment.json"
);

/*
 * deployment:
 *   redPacketAddress
 *   redPacketOwner
 *   redPacketID
 *   simpleTokenAddress
 */
function readMerkleDistributorDeployment() {
  if (!fs.existsSync(DEPLOYMENGT_DIR)) return null;
  try {
    return JSON.parse(fs.readFileSync(DEPLOYMENGT_DIR, { encoding: "utf-8" }));
  } catch {
    return null;
  }
}

function saveMerkleDistributorDeployment(payload) {
  let oldData = readMerkleDistributorDeployment();
  if (!oldData) oldData = {};
  fs.writeFileSync(
    DEPLOYMENGT_DIR,
    JSON.stringify({
      ...oldData,
      ...payload,
    }),
    { flag: "w+" }
  );
  return true;
}

async function verifyContract(
  contractName,
  network = hre.network.name,
  constructorArguments = null
) {
  const data = fs.readFileSync(DEPLOYMENGT_DIR, "utf8");
  const addresses = JSON.parse(data);
  const address = addresses[contractName];

  if (!address) {
    console.error("verifyContract error: Contract depoloyment not found.");
    return;
  }

  let params = {
    address,
    network,
    constructorArguments: [],
  };
  if (constructorArguments) {
    params.constructorArguments = constructorArguments;
  }

  try {
    await hre.run("verify:verify", params);
    console.log("verifyContract successfully!");
  } catch (e) {
    console.error("verifyContract error:", e);
  }
}

module.exports = {
  DEPLOYMENGT_DIR,
  verifyContract,
  readMerkleDistributorDeployment,
  saveMerkleDistributorDeployment,
};
