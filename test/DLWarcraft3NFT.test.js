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

  describe("Mint", function () {
    before(async function () {
      chainId = network.config.chainId;
      [owner, alice, bob] = await ethers.getSigners();

      const nftName = "DLWarcraft3NFT";
      const nftSymbol = "DLW3";
      const signerManager = owner.address;
      const baseURI = "https://devapi.dapplearning.org/dlwarcraft?rank=";
      DLWarcraft3NFT = await deployContract("DLWarcraft3NFT", [
        nftName,
        nftSymbol,
        signerManager,
        baseURI,
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

  describe("Mint all elements", function () {
    this.timeout(20 * 60000);

    before(async function () {
      chainId = network.config.chainId;
      [owner, alice, bob] = await ethers.getSigners();

      const nftName = "DLWarcraft3NFT";
      const nftSymbol = "DLW3";
      const signerManager = owner.address;
      const baseURI = "https://devapi.dapplearning.org/dlwarcraft?rank=";
      DLWarcraft3NFT = await deployContract("DLWarcraft3NFT", [
        nftName,
        nftSymbol,
        signerManager,
        baseURI,
      ]);
    });

    it("Mint all elements", async () => {
      const provider = ethers.provider;
      const baseURI = await DLWarcraft3NFT.baseURI();
      const RANKLENGTH = Number(await DLWarcraft3NFT.RANKLENGTH());
      const accounts = [];
      const tokenIds = [];
      const tokenRanks = [];
      for (let i = 0; i < 1000; i++) {
        accounts.push(ethers.Wallet.createRandom(provider));
      }
      const balanceInWei = ethers.parseEther("1").toString(16);
      for (const account of accounts) {
        await provider.send("hardhat_setBalance", [
          account.address,
          "0x" + balanceInWei,
        ]);
        const receiver = account.address;
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

        await DLWarcraft3NFT.connect(account).claim(
          receiver,
          signedAt,
          seed,
          signature,
        );

        const tokenId = Number(await DLWarcraft3NFT.claimedTokenIdBy(receiver));
        const rank = Number(await DLWarcraft3NFT.tokenURIs(tokenId));
        const tokenURI = await DLWarcraft3NFT.tokenURI(tokenId);
        const totalSupply = await DLWarcraft3NFT.totalSupply();

        console.log({ tokenId, rank, totalSupply, tokenURI });

        expect(tokenIds.includes(tokenId), "tokenId should unique").to.be.eq(
          false,
        );
        expect(tokenRanks.includes(rank), "tokenRank should unique").to.be.eq(
          false,
        );
        expect(tokenId, "tokenId should less than RANKLENGTH").to.lte(
          RANKLENGTH,
        );
        expect(rank, "tokenRank should less than RANKLENGTH").to.lte(
          RANKLENGTH,
        );

        tokenIds.push(tokenId);
        tokenRanks.push(rank);

        expect(tokenId, "tokenId should be eq totalSupply").to.be.eq(
          totalSupply,
        );
        expect(
          await DLWarcraft3NFT.validRank(Number(rank)),
          "validRank should be true after mint",
        ).to.be.eq(true);
        expect(
          await DLWarcraft3NFT.claimedBitMap(receiver),
          "claimedBitMap should be true after mint",
        ).to.be.eq(true);
        expect(tokenURI, "tokenURI should be contain rank").to.be.eq(
          `${baseURI}${rank}`,
        );
      }

      expect(tokenIds.length, "tokenIds.length eq RANKLENGTH").to.be.eq(
        RANKLENGTH,
      );
      expect(tokenRanks.length, "tokenIds.length eq RANKLENGTH").to.be.eq(
        RANKLENGTH,
      );

      const tokenRanksSorted = tokenRanks.sort();

      console.log("tokenIds", tokenIds);
      console.log("tokenRanks", tokenRanks);
      console.log("tokenRanksSorted", tokenRanksSorted);

      expect(
        tokenRanksSorted[RANKLENGTH - 1],
        "max rank eq RANKLENGTH",
      ).to.be.eq(RANKLENGTH - 1);
    });
  });
});
