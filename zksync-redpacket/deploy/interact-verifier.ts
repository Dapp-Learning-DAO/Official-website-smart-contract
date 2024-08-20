import * as hre from "hardhat";
import path from "path";
import { deployContract, getWallet } from "./utils";
import { ethers, toBigInt } from "ethers";
import { encodePacked, keccak256, parseEther, toHex } from "viem";
import { buildPoseidon } from "circomlibjs";
import { groth16 } from "snarkjs";
import Vkey from "./lib/zksnark/verification_key.json";
import contractDeployments from "./zkSync_deployment.json";

function hashToken(account: `0x${string}`) {
  return Buffer.from(
    keccak256(encodePacked(["address"], [account])).slice(2),
    "hex",
  );
}

function convertCallData(calldata: string) {
  const argv = calldata.replace(/["[\]\s]/g, "").split(",");

  const a = [argv[0], argv[1]];
  const b = [
    [argv[2], argv[3]],
    [argv[4], argv[5]],
  ];
  const c = [argv[6], argv[7]];

  let input = [];
  // const input = [argv[8], argv[9]];
  for (let i = 8; i < argv.length; i++) {
    input.push(argv[i] as never);
  }

  return { a, b, c, input };
}

export const calcProof = async (input: string) => {
  const proveRes = await groth16.fullProve(
    { in: keccak256(toHex(input)) },
    path.join(__dirname, "./lib/zksnark/datahash.wasm"),
    path.join(__dirname, "./lib/zksnark/circuit_final.zkey"),
  );

  const res = await groth16.verify(
    Vkey,
    proveRes.publicSignals,
    proveRes.proof,
  );

  if (res) {
    console.log("calculateProof verify passed!");

    const proof = convertCallData(
      await groth16.exportSolidityCallData(
        proveRes.proof,
        proveRes.publicSignals,
      ),
    );

    return {
      proof: proof,
      publicSignals: proveRes.publicSignals,
    };
  } else {
    console.error("calculateProof verify faild.");
    return null;
  }
};

// Address of the contract to interact with
// const CONTRACT_ADDRESS = ""; // zksync mainnet

// sepolia SimpleToken address 0xD9a42d80741D4CE4513c16a70032C3B95cbB0CCE

// zero bytes
const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// An example of a script to interact with the contract
export default async function () {
  const CONTRACT_ADDRESS = contractDeployments.Verifier;
  console.log(`Running script to interact with contract ${CONTRACT_ADDRESS}`);

  // Load compiled contract info
  const contractArtifact = await hre.artifacts.readArtifact("Groth16Verifier");

  const wallet = getWallet();

  // Initialize contract instance for interaction
  const verifier = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractArtifact.abi,
    wallet, // Interact with the contract on behalf of this wallet
  );

  const password = "abcd1234";
  const proofRes = await calcProof(password);
  if (proofRes) {
    const {
      proof: { a, b, c },
      publicSignals,
    } = proofRes;
    const res = await verifier.verifyProof(a, b, c, publicSignals);
    console.log("verifier.verifyProof()", res);
  }
}
