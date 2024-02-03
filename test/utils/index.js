const { encodePacked, keccak256, toHex } = require("viem");
const { buildPoseidon } = require("circomlibjs");
const hre = require("hardhat");
const path = require("path");
const fs = require("fs");
const snarkjs = require("snarkjs");

function convertZKSnarkCallData(calldata) {
  // console.log("calldata origin", calldata);
  const argv = calldata.replace(/["[\]\s]/g, "").split(",");

  //console.log("argv", argv);

  const a = [argv[0], argv[1]];
  const b = [
    [argv[2], argv[3]],
    [argv[4], argv[5]],
  ];
  const c = [argv[6], argv[7]];

  let input = [];
  // const input = [argv[8], argv[9]];
  for (let i = 8; i < argv.length; i++) {
    input.push(argv[i]);
  }

  return { a, b, c, input };
}

const calculatePublicSignals = async (input) => {
  const poseidon = await buildPoseidon();
  const hash = poseidon.F.toString(poseidon([toHex(input)]));
  return toHex(BigInt(hash), { size: 32 });
};

const calculateZKProof = async (input) => {
  const proveRes = await snarkjs.groth16.fullProve(
    { in: toHex(input) },
    path.join(__dirname, "../../zk-redpacket/build/datahash_js/datahash.wasm"),
    path.join(__dirname, "../../zk-redpacket/circuit_final.zkey"),
  );

  const vKey = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../../zk-redpacket/verification_key.json"),
    ),
  );
  const checkRes = await snarkjs.groth16.verify(
    vKey,
    proveRes.publicSignals,
    proveRes.proof,
  );
  if (checkRes) {
    // console.log("snarkjs verify OK!");
  } else {
    throw "snarkjs verify faild!";
  }

  // console.log("calculateProof verify passed!");

  // @remind 必须使用 exportSolidityCallData 方法转换，否则calldata顺序不对
  const proof = convertZKSnarkCallData(
    await snarkjs.groth16.exportSolidityCallData(
      proveRes.proof,
      proveRes.publicSignals,
    ),
  );

  return {
    proof: proof,
    publicSignals: proveRes.publicSignals,
  };
};

module.exports = {
  hashToken,
  convertZKSnarkCallData,
  calculatePublicSignals,
  calculateZKProof,
};
