import * as hre from "hardhat";
import path from "path";
import { deployContract, getWallet } from "./utils";
import {
  EventLog,
  Log,
  MaxUint256,
  ethers,
  formatUnits,
  parseUnits,
} from "ethers";
import MerkleTree from "merkletreejs";
import { encodePacked, keccak256, parseEther, toHex } from "viem";
import { groth16 } from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import contractDeployments from "./zkSync_deployment.json";
import Vkey from "./lib/zksnark/verification_key.json";
import { calcProof } from "./interact-verifier";

function hashToken(account: `0x${string}`) {
  return Buffer.from(
    keccak256(encodePacked(["address"], [account])).slice(2),
    "hex",
  );
}

// Address of the contract to interact with
// const CONTRACT_ADDRESS = "0x0Aa38Cffc6A72e6349c8bfF22497AeC4A02fc75c"; // zksync mainnet

// sepolia SimpleToken address 0xD9a42d80741D4CE4513c16a70032C3B95cbB0CCE

// zero bytes
const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const tokenAmount = parseUnits("10", 18);
const password = "abcd1234";

// An example of a script to interact with the contract
export default async function () {
  const CONTRACT_ADDRESS = contractDeployments.Redpacket;
  console.log(`Running script to interact with contract ${CONTRACT_ADDRESS}`);

  // Load compiled contract info
  const contractArtifact = await hre.artifacts.readArtifact("HappyRedPacket");

  const wallet = getWallet();

  // Initialize contract instance for interaction
  const redPacket = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractArtifact.abi,
    wallet, // Interact with the contract on behalf of this wallet
  );
  const redPacketAddress = await redPacket.getAddress();

  const testToken = new ethers.Contract(
    contractDeployments.SimpleToken,
    (await hre.artifacts.readArtifact("SimpleToken")).abi,
    wallet,
  );
  const testTokenAddress = await testToken.getAddress();

  const allowanceRes = await testToken.allowance(
    wallet.address,
    redPacketAddress,
  );
  console.log(`allowance: ${formatUnits(allowanceRes, 18)}`);

  if (allowanceRes < tokenAmount) {
    let approveRes = await testToken.approve(redPacketAddress, MaxUint256);
    console.log(`approve tx res`, approveRes);
  }

  // Run contract read function
  console.log("Redpacket Nonce:", await redPacket.nonce());

  const claimerList = [
    wallet.address,
    "0x1fae896f3041d7e8Bf5Db08cAd6518b0Eb82164a",
  ];

  const merkleTree = new MerkleTree(
    claimerList.map((user) => hashToken(user as `0x${string}`)),
    keccak256,
    { sortPairs: true },
  );
  const merkleTreeRoot = merkleTree.getHexRoot();
  console.log("merkleTree Root:", merkleTreeRoot);

  let message = new Date().getTime().toString();

  let lock = ZERO_BYTES32;
  if (password) {
    lock = await calculatePublicSignals(password);
  }

  let redpacketID = "";

  async function createRedpacket() {
    // create_red_packet
    let creationParams = {
      _merkleroot: merkleTreeRoot,
      _lock: lock,
      _number: claimerList.length,
      _ifrandom: true,
      _duration: 259200,
      _message: message,
      _name: "cache",
      _token_type: 1,
      _token_addr: testTokenAddress,
      _total_tokens: parseEther("1"),
    };

    let createRedPacketTx = await redPacket.create_red_packet(
      ...Object.values(creationParams),
    );
    const createRedPacketRes = await createRedPacketTx.wait();
    const creationEvent = createRedPacketRes.logs.find(
      (_log: EventLog) =>
        typeof _log.fragment !== "undefined" &&
        _log.fragment.name === "CreationSuccess",
    );
    if (creationEvent) {
      const [
        total,
        id,
        name,
        message,
        creator,
        creation_time,
        token_address,
        number,
        ifrandom,
        duration,
        hash_lock,
      ] = creationEvent.args;
      redpacketID = id;

      console.log(
        `CreationSuccess Event, total: ${total.toString()}\tRedpacketId: ${id}  `,
      );
      console.log(`lock: ${hash_lock}`);
    } else {
      throw "Can't parse CreationSuccess Event";
    }

    console.log("Create Red Packet successfully");
  }

  // claim
  async function cliamRedPacket(user) {
    let merkleProof = merkleTree.getHexProof(hashToken(user.address));
    const balanceBefore = await testToken.balanceOf(user.address);

    let claimTx: any;
    if (password) {
      const proofRes = await calculateProof(password);
      if (proofRes) {
        const {
          proof: { a, b, c },
          publicSignals,
        } = proofRes;
        claimTx = await redPacket
          .claimPasswordRedpacket(redpacketID, merkleProof, a, b, c)
          .catch((err) => console.error(err));
      }
    } else {
      claimTx = await redPacket.claimOrdinaryRedpacket(
        redpacketID,
        merkleProof,
      );
    }

    const createRedPacketRecipt = await claimTx.wait();
    console.log("createRedPacketRecipt", createRedPacketRecipt);

    const balanceAfter = await testToken.balanceOf(user.address);
    console.log(
      `user ${user.address} has claimd ${balanceAfter - balanceBefore}`,
    );
  }

  await createRedpacket();
  await cliamRedPacket(wallet);
}

const calculateProof = async (input: string) => {
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

const calculatePublicSignals = async (input: string) => {
  const poseidon = await buildPoseidon();
  const hash = poseidon.F.toString(poseidon([keccak256(toHex(input))]));
  return toHex(BigInt(hash), { size: 32 });
};

function convertCallData(calldata: string) {
  const argv: string[] = calldata.replace(/["[\]\s]/g, "").split(",");

  const a = [argv[0], argv[1]];
  const b = [
    [argv[2], argv[3]],
    [argv[4], argv[5]],
  ];
  const c = [argv[6], argv[7]];

  let input: string[] = [];
  // const input = [argv[8], argv[9]];
  for (let i = 8; i < argv.length; i++) {
    input.push(argv[i] as never);
  }

  return { a, b, c, input };
}
