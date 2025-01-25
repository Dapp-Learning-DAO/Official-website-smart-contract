const fs = require("fs");
const path = require("path");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForConfirmations(provider, txHash, confirmations) {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) throw new Error("Transaction failed");

  const initialBlock = receipt.blockNumber;
  while (true) {
    const currentBlock = await provider.getBlockNumber();
    if (currentBlock >= initialBlock + confirmations) break;
    await sleep(1000); // Wait 1 second before checking again
  }
}

async function readDeployment(dir) {
  if (fs.existsSync(dir)) {
    return JSON.parse(fs.readFileSync(dir, { encoding: "utf-8" }));
  }
  return null;
}

async function saveDeployment(deployment, dir) {
  if (fs.existsSync(path.dirname(dir))) {
    const oldData = await readDeployment(dir);
    if (oldData) {
      deployment = {
        ...oldData,
        ...deployment,
      };
    }
  }
  fs.writeFileSync(dir, JSON.stringify(deployment, null, 2), { flag: "w+" });
}

async function readVaultRecord() {
  const recordPath = path.join(__dirname, "vaults-record.json");
  if (fs.existsSync(recordPath)) {
    return JSON.parse(fs.readFileSync(recordPath, { encoding: "utf-8" }));
  }
  return { vaults: {} };
}

async function saveVaultRecord(network, vaultId, vaultInfo) {
  const recordPath = path.join(__dirname, "vaults-record.json");
  const records = await readVaultRecord();

  if (!records.vaults[network]) {
    records.vaults[network] = {};
  }

  records.vaults[network][vaultId] = {
    ...vaultInfo,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(recordPath, JSON.stringify(records, null, 2), {
    flag: "w+",
  });
}

async function getLatestVaultId(network) {
  const records = await readVaultRecord();
  const networkVaults = records.vaults[network] || {};
  const vaultIds = Object.keys(networkVaults);
  return vaultIds.length > 0 ? vaultIds[vaultIds.length - 1] : "0";
}

module.exports = {
  sleep,
  waitForConfirmations,
  readDeployment,
  saveDeployment,
  readVaultRecord,
  saveVaultRecord,
  getLatestVaultId,
};
