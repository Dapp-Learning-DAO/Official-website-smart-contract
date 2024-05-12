const { ethers } = require("hardhat");
const MerkleTree = require("./merkle-tree.js");
const BalanceTree = require("./balance-tree.js");
const keccak256 = require("keccak256");
const { expect, assert } = require("chai");
const fs = require("fs");
const { deployContract, AddressZero } = require("../utils/index.js");
//const tokens = require('./tokens.json');

describe("ClaimAbleNFT", function () {
  let owner;
  let alice;
  let bob;
  let claimableNFT;

  console.log(BalanceTree);
  describe("Mint all elements", function () {
    before(async function () {
      [owner, alice, bob] = await ethers.getSigners();
      console.log(owner.address);
      console.log(alice.address);
      console.log(bob.address);

      const nftName = "test NFT";
      const nftSymbol = "tNFT";
      const signerManager = owner.address;
      const baseURL = "http://google.cn";
      claimableNFT = await deployContract("ClaimableNFT", [nftName, nftSymbol, signerManager, baseURL]);
    });

    it("expect fail", async () => {
      const receipts = alice.address;
      const signedAt = Date.now();
      const seed = Math.floor(Math.random() * 1000) + 1;
      const chainId = 1;
      const signature = "Abcd1245";//ERROR signature
      try {
        // 执行导致错误的交易
        claimableNFT.connect(alice).claim(receipts, signedAt, seed, chainId, Buffer.from(signature)),
          assert.fail('Expected the function to revert');
      } catch (error) {
        console.log("yes!!! claim error");
      }

    });


    it("expect success", async () => {
      const receipts = alice.address;
      const signedAt = Date.now();
      const seed = Math.floor(Math.random() * 1000) + 1;
      const chainId = 1;
      const message = "HELLO";
      const messageHash = keccak256(Buffer.from(message));
      // const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));

      // const messageHash = ethers.utils.solidityKeccak256(['string'], [message]);

      const signature = await owner.signMessage(Buffer.from(messageHash));
      console.log("signature".length);
      await claimableNFT.connect(alice).claim(receipts, signedAt, seed, chainId, Buffer.from(signature));

      // Sign the message hash with a private key
      // const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      // const wallet = new ethers.Wallet(privateKey);
      // const signature = wallet.signMessage(ethUtil.toBuffer(messageHash));
    });



    // it("transfer eth batch", async () => {
    //   let receipts = [alice.address, bob.address];
    //   let amounts = [100, 200];
    //   await distributorFactory.batchTransferETH(receipts, amounts, {
    //     value: 300,
    //   });
    // });

    // it("transfer token batch", async () => {
    //   let receipts = [alice.address, bob.address];
    //   let amounts = [100, 200];
    //   await erc20.approve(distributorFactory.address, 300);
    //   await distributorFactory.batchTransfer(erc20.address, receipts, amounts);
    // });
  });
});
