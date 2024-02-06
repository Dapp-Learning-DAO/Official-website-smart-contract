const { ethers } = require("hardhat");
const MerkleTree = require("./merkle-tree.js");
const BalanceTree = require("./balance-tree.js");
const { keccak256, encodePacked, getAddress } = require("viem");
const { expect } = require("chai");
const fs = require("fs");
const { deployContract, AddressZero } = require("../utils");
//const tokens = require('./tokens.json');

let repackMessage = "MyRedPacket";

describe("ERC20MerkleDrop", function () {
  let treeRoot;
  let erc20;
  let owner;
  let alice;
  let bob;
  let tree;
  let distributorEth;
  let distributorErc20;
  let distributorFactory;
  let distributorFile;
  let fileTree;

  // merkleTree = new MerkleTree(Object.entries(tokens).map(token => hashToken(...token)), keccak256, { sortPairs: true });
  console.log(BalanceTree);
  describe("Mint all elements", function () {
    before(async function () {
      [owner, alice, bob] = await ethers.getSigners();
      console.log(owner.address);
      console.log(alice.address);
      console.log(bob.address);
      erc20 = await deployContract("TestERC20", [
        "AAA token",
        "AAA",
        100000000,
      ]);
      tree = new BalanceTree([
        { account: alice.address, amount: 100n },
        { account: bob.address, amount: 101n },
      ]);

      let json = JSON.parse(
        fs.readFileSync("./test/erc20.json", { encoding: "utf8" }),
      );

      if (typeof json !== "object") throw new Error("Invalid JSON");

      //console.log(JSON.stringify(json));

      //---------------

      let balances = new Array();
      let valid = true;
      for (const [key, value] of Object.entries(json)) {
        balances.push({ account: key, amount: value });
      }
      fileTree = new BalanceTree(balances);

      // Root
      const root = fileTree.getHexRoot().toString("hex");
      console.log("Reconstructed merkle root", root);
      //defactory factory
      distributorFactory = await deployContract("MerkleDistributorFactory");

      //distribute erc20
      let number = 2;
      let message = `${repackMessage}01`;
      let packetName = `packet01`;
      let token = erc20.address;
      let tokenTotal = 301;
      let merkleRoot = tree.getHexRoot();
      let duration = 3600;

      await erc20.approve(distributorFactory.address, tokenTotal);
      await distributorFactory.createDistributor(
        number,
        message,
        packetName,
        token,
        tokenTotal,
        merkleRoot,
        duration,
      );
      let id = keccak256(
        encodePacked(["address", "string"], [owner.address, message]),
      );

      let distributorErc20Address =
        await distributorFactory.redpacket_by_id(id);
      distributorErc20 = await ethers.getContractAt(
        "MerkleDistributor",
        distributorErc20Address,
      );
      console.log(
        `success distributorErc20 id:${id} address:${distributorErc20.address}`,
      );

      message = `${repackMessage}02`;
      packetName = `packet02`;
      //discribute eth
      await distributorFactory.createDistributorWithEth(
        number,
        message,
        packetName,
        merkleRoot,
        duration,
        { value: tokenTotal },
      );
      id = keccak256(
        encodePacked(["address", "string"], [owner.address, message]),
      );
      let distributorEthAddress = await distributorFactory.redpacket_by_id(id);
      distributorEth = await ethers.getContractAt(
        "MerkleDistributor",
        distributorEthAddress,
      );
      console.log(
        `success distributorEth id:${id} address:${distributorErc20.address}`,
      );

      //expect fail
      await expect(
        distributorFactory.createDistributorWithEth(
          number,
          message,
          packetName,
          merkleRoot,
          duration,
          { value: tokenTotal },
        ),
      ).to.be.revertedWith("Distributor already exists");
    });

    it("expect fail", async () => {
      //eg:error amount
      let proof = tree.getProof(0, alice.address, 200n);
      await expect(
        distributorErc20.connect(alice).claim(0, 200, proof),
      ).to.be.revertedWith("MerkleDistributor: Invalid proof.");
      //eg:error amount
      proof = tree.getProof(0, alice.address, 100n);
      await expect(
        distributorErc20.connect(alice).claim(0, 200, proof),
      ).to.be.revertedWith("MerkleDistributor: Invalid proof.");
    });

    it("check claim erc20.expect success", async () => {
      const proof0 = tree.getProof(0, alice.address, 100n);

      //claim
      await expect(distributorErc20.connect(alice).claim(0, 100, proof0))
        .to.emit(distributorErc20, "Claimed")
        .withArgs(0, alice.address, 100);
      const proof1 = tree.getProof(1, bob.address, 101n);
      await expect(distributorErc20.connect(bob).claim(1, 101, proof1))
        .to.emit(distributorErc20, "Claimed")
        .withArgs(1, bob.address, 101);

      //check balance
      let balance = await erc20.balanceOf(alice.address);
      expect(balance.toString()).to.equal("100");
      balance = await erc20.balanceOf(bob.address);
      expect(balance.toString()).to.equal("101");
    });

    it("check claim eth.expect success", async () => {
      const proof0 = tree.getProof(0, alice.address, 100n);

      //claim
      await expect(distributorEth.connect(alice).claim(0, 100, proof0))
        .to.emit(distributorEth, "Claimed")
        .withArgs(0, alice.address, 100);
      const proof1 = tree.getProof(1, bob.address, 101n);
      await expect(distributorEth.connect(bob).claim(1, 101, proof1))
        .to.emit(distributorEth, "Claimed")
        .withArgs(1, bob.address, 101);

      //check balance
      let balance = await erc20.balanceOf(alice.address);
      expect(balance.toString()).to.equal("100");
      balance = await erc20.balanceOf(bob.address);
      expect(balance.toString()).to.equal("101");
    });

    it("expect claim fail:error amount", async () => {
      //eg: claim twice
      let proof = tree.getProof(0, alice.address, 100n);
      await expect(
        distributorErc20.connect(alice).claim(0, 100, proof),
      ).to.be.revertedWith("MerkleDistributor:already claimed");
    });

    it("owner refund", async () => {
      //only owner
      await expect(
        distributorEth.connect(alice).refund(erc20.address, owner.address),
      )
        .to.be.revertedWithCustomError(
          distributorEth,
          "OwnableUnauthorizedAccount",
        )
        .withArgs(alice.address);
      // .to.be.revertedWith(`OwnableUnauthorizedAccount("${alice.address}")`);

      //owner refund
      await ethers.provider.send("evm_increaseTime", [60 * 60]); // increate time
      await distributorEth.connect(owner).refund(AddressZero, owner.address);
    });
  });
});
