const chai = require("chai");
const { before } = require("mocha");
const path = require("path");
const { buildPoseidonOpt } = require("circomlibjs");
//const {circomlibjs} = require('circomlibjs');
const snarkjs = require("snarkjs");
const fs = require("fs");
const { deployContract } = require("../utils");
const wasm_tester = require("circom_tester").wasm;

describe("verify hash", () => {
  let circuit;
  let poseidon;
  let groth16Verifier;
  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, "../zk-redpacket/circuits", "datahash.circom"),
    );
    poseidon = await buildPoseidonOpt();

    groth16Verifier = await deployContract("Groth16Verifier");
    console.log("Groth16Verifier address:", groth16Verifier.address);
  });

  // it('should pass test', async ()=>{
  //     //Create input
  //     const data = buf2hex([1,1,1]);//byte array cannot be converted to BigInt directly, so we use hex
  //     const dataHash = buf2hex(await goodPoseidon(poseidon, [data]));//byte array cannot be converted to BigInt directly, so we use hex
  //     const input = {
  //         data,
  //         dataHash
  //     }
  //     var witness = await circuit.calculateWitness(input, true);
  //     await circuit.checkConstraints(witness);
  //     await circuit.assertOut(witness, {out: "0"});

  // })

  it("poseidon test", async () => {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      { in: 2024 },
      "./zk-redpacket/build/datahash_js/datahash.wasm",
      "./zk-redpacket/circuit_final.zkey",
    );

    //const encodedString = ethers.utils.defaultAbiCoder.encode(["string"], ["hello world"]);
    // console.log("encodedString ", encodedString);

    const hash = poseidon.F.toString(poseidon([2024]));
    console.log("hash ", hash);
    console.log("pbs: ", publicSignals);
    console.log("proof: ", proof);

    const vKey = JSON.parse(
      fs.readFileSync("./zk-redpacket/verification_key.json"),
    );

    const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    if (res === true) {
      console.log("Verification OK");
    } else {
      console.log("Invalid proof");
    }

    const cd = convertCallData(
      await snarkjs.groth16.exportSolidityCallData(proof, publicSignals),
    );
    console.log("calldata", cd);

    const verifyRes = await groth16Verifier.verifyProof(
      cd.a,
      cd.b,
      cd.c,
      cd.input,
    );

    // let result =  await groth16Verifier.verifyProof(proof.pi_a, proof.pi_b, proof.pi_c, publicSignals)
    console.log("verifyRes ", verifyRes);

    //   //from proof json
    //   const verifyRes1 = await groth16Verifier.verifyProof(["0x2b51950ac5e0d0701d7544878fc9f3dd71a9ec13a797bbd9ebf3312d26e8c4f2", "0x2a7921df664567e61bdabc08df8e99383772ae301dc61e8420c79d37cb696f6e"],
    //   [["0x1f5556fae94494fc29c05e1e1df389b0968e951305cfdf70f46a6641c9684849", "0x1c566d85dc6912580a57f36ffbfe102d454a9be0cc501b8d0c2c9c57e118550a"],["0x07d20e5b83e16c4b147b73604eaa0536d62bae145e02c8fdf0f5a5d2c09ea6f6", "0x1558491c0a695c7518e15b3c5fc581d7ffee6d07d23ea18e2200fae8ad78e594"]],
    //   ["0x219cf4ed24a4f1606e0c18c364b155e830a7ef6bf8194bba2def565db3e0f359", "0x2fc2bd13fb5f1a90de6b5b2ed9407e27f68129a9f900a9d7aa7b8ead59e4e053"],
    //   ["0x1be634dfebcccc660ce595ef6a713c84e51b954823e678146e468b96ac94bb5e"]);

    //     console.log("verifyRes1 ", verifyRes1);
  });
});

function buf2hex(buffer) {
  // buffer is an ArrayBuffer
  return (
    "0x" +
    [...new Uint8Array(buffer)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

async function goodPoseidon(poseidon, input) {
  const ansInFF = poseidon(input);
  return (await poseidon.F.batchFromMontgomery(ansInFF)).reverse();
}

function convertCallData(calldata) {
  // console.log("calldata origin", calldata);
  const argv = calldata
    .replace(/["[\]\s]/g, "")
    .split(",")
    .map((x) => x.toString());

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
