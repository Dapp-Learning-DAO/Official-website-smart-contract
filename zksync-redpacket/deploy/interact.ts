import * as hre from "hardhat";
import { deployContract, getWallet } from "./utils";
import { ethers } from "ethers";
import MerkleTree from "merkletreejs";
import { encodePacked, keccak256, parseEther } from "viem";

function hashToken(account: `0x${string}`) {
  return Buffer.from(
    keccak256(encodePacked(["address"], [account])).slice(2),
    "hex",
  );
}

// sleep function
let endSleep = false;
async function sleep() {
  for (let i = 0; i < 500; i++) {
    if (endSleep) break;
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
  }
  if (!endSleep) console.log(`\nhad slept too long, but no result...`);
}

// Address of the contract to interact with
// const CONTRACT_ADDRESS = "0x0Aa38Cffc6A72e6349c8bfF22497AeC4A02fc75c"; // zksync mainnet
const CONTRACT_ADDRESS = "0xA3130cd61aD39787B61B7F3ce55CDaA68882beE5"; // zksync sepolia
if (!CONTRACT_ADDRESS)
  throw "⛔️ Provide address of the contract to interact with!";

// sepolia SimpleToken address 0xD9a42d80741D4CE4513c16a70032C3B95cbB0CCE

// zero bytes
const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// An example of a script to interact with the contract
export default async function () {
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

  const testToken = new ethers.Contract(
    "0xD9a42d80741D4CE4513c16a70032C3B95cbB0CCE",
    (await hre.artifacts.readArtifact("SimpleToken")).abi,
    wallet,
  );

  // let approveTx = await testToken.approve(
  //   redPacket.address,
  //   ethers.constants.MaxUint256,
  // );
  // approveTx.wait();
  // console.log(`approve tx ${approveTx}`)

  // Run contract read function
  console.log(await redPacket.nonce());

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

  // create_red_packet
  // create_red_packet
  let creationParams = {
    _merkleroot: merkleTreeRoot,
    _lock: ZERO_BYTES32,
    _number: 2,
    _ifrandom: true,
    _duration: 259200, // 259200
    _message: message,
    _name: "cache",
    _token_type: 1,
    _token_addr: testToken.address,
    // total_tokens: ethers.utils.parseEther('100'),
    _total_tokens: 100,
  };

  let redpacketID = "";
  redPacket.once(
    "CreationSuccess",
    (
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
      ZERO_BYTES32,
    ) => {
      endSleep = true;
      redpacketID = id;

      console.log(
        `CreationSuccess Event, total: ${total.toString()}\tRedpacketId: ${id}  `,
      );
    },
  );

  let createRedPacketRecipt = await redPacket.create_red_packet(
    ...Object.values(creationParams),
    {
      // sometimes it will be fail if not specify the gasLimit
      gasLimit: 1483507,
      // value: parseEther("0.3"),
    },
  );
  await createRedPacketRecipt.wait();

  console.log("Create Red Packet successfully");

  await sleep();

  // claim
  async function cliamRedPacket(user) {
    let proof = merkleTree.getHexProof(hashToken(user.address));
    const balanceBefore = await testToken.balanceOf(user.address);

    let createRedPacketRecipt = await redPacket
      .connect(user)
      .claimOrdinaryRedpacket(redpacketID, proof, {
        // sometimes it will be fail if not specify the gasLimit
        gasLimit: 1483507,
      });
    await createRedPacketRecipt.wait();

    const balanceAfter = await testToken.balanceOf(user.address);
    console.log(
      `user ${user.address} has claimd ${balanceAfter - balanceBefore}`,
    );
  }

  await cliamRedPacket(wallet);
}
