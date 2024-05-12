const { ethers, network } = require("hardhat");
const { expect, assert } = require("chai");
const fs = require("fs");
const { deployContract, AddressZero } = require("../utils/index.js");
//const tokens = require('./tokens.json');

const createSignature = async (
  wallet,
  receiver,
  seed,
  signedAt,
  chainid,
  NFTAddress,
) => {
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "uint256", "uint256", "address"],
    [receiver, seed, signedAt, chainid, NFTAddress],
  );
  const payloadHash = ethers.keccak256(payload);
  return wallet.signMessage(ethers.getBytes(payloadHash));
};

describe("DLWarcraft3NFT", function () {
  let chainId;
  let owner;
  let alice;
  let bob;
  let DLWarcraft3NFT;

  describe("Mint all elements", function () {
    before(async function () {
      chainId = network.config.chainId;
      [owner, alice, bob] = await ethers.getSigners();
      console.log(owner.address);
      console.log(alice.address);
      console.log(bob.address);

      const nftName = "DLWarcraft3NFT";
      const nftSymbol = "DLW3";
      const signerManager = owner.address;
      const baseURL = "https://dapplearning.org";
      DLWarcraft3NFT = await deployContract("DLWarcraft3NFT", [
        nftName,
        nftSymbol,
        signerManager,
        baseURL,
      ]);
    });

    it("expect fail", async () => {
      const receiver = alice.address;
      const signedAt = Date.now();
      const seed = Math.floor(Math.random() * 1000) + 1;
      const signature = await createSignature(
        owner,
        receiver,
        seed,
        signedAt,
        chainId,
        DLWarcraft3NFT.address,
      );
      await expect(
        DLWarcraft3NFT.connect(alice).claim(
          receiver,
          signedAt,
          seed,
          signature.slice(0, 2),
        ),
      ).to.revertedWithCustomError(DLWarcraft3NFT, "IncorrectSignature");
    });

    it("expect success", async () => {
      const receiver = alice.address;
      const signedAt = Math.floor(Date.now() / 1000);
      const seed = Math.floor(Math.random() * 1000) + 1;

      const signature = await createSignature(
        owner,
        receiver,
        seed,
        signedAt,
        chainId,
        DLWarcraft3NFT.address,
      );

      await DLWarcraft3NFT.connect(alice).claim(
        receiver,
        signedAt,
        seed,
        signature,
      );
    });
  });
});
