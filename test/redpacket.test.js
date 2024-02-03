const { ethers } = require("hardhat");
const { parseUnits, keccak256, encodePacked, toHex } = require("viem");

const { expect } = require("chai");
const MerkleTree = require("./merkle-tree");
const {
  hashToken,
  convertZKSnarkCallData,
  calculatePublicSignals,
  calculateZKProof,
} = require("./utils/index.js");
const { deployContract } = require("../utils");

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

describe("redpacket", function () {
  let treeRoot;
  let erc20;
  let owner;
  let alice;
  let bob;
  let merkleTree;
  let groth16Verifier;
  let redPacket;

  beforeEach(async function () {
    const total_supply = parseUnits("1000000", 18);
    [owner, alice, bob] = await ethers.getSigners();
    erc20 = await deployContract("SimpleToken", [
      "AAA token",
      "AAA",
      18,
      total_supply,
    ]);

    merkleTree = new MerkleTree(
      [owner, alice, bob].map((user) => hashToken(user.address)),
      keccak256,
      { sortPairs: true },
    );

    // Root
    treeRoot = merkleTree.getHexRoot().toString("hex");
    // console.log("MerkleTree root", treeRoot);

    groth16Verifier = await deployContract("Groth16Verifier");
    redPacket = await deployContract("HappyRedPacket");

    // Init red packet
    let initTx = await redPacket.initialize(groth16Verifier.address, {
      // sometimes it will be fail if not
      gasLimit: 1483507,
    });

    await initTx.wait();
    // await erc20.transfer(owner.address, parseUnits("10000", 18));
    await erc20
      .connect(owner)
      .approve(redPacket.address, parseUnits("10000", 18));

    // expect(await erc20.balanceOf(owner.address)).to.equal(total_supply);
  });

  async function createRedpacket(
    totalAmount,
    ifrandom,
    hashLock = ZERO_BYTES32,
    duration = 1 * 24 * 60 * 60,
    message = "some message",
  ) {
    const name = "Redpacket Name";
    const total_tokens = parseUnits(totalAmount, 18);
    const redpacketId = keccak256(
      encodePacked(["address", "string"], [owner.address, message]),
    );
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    const creation_time = block.timestamp + 1;

    await expect(
      redPacket.connect(owner).create_red_packet(
        treeRoot,
        hashLock,
        3, // number
        ifrandom, // ifrandom
        duration, // 1day
        message, // message
        name,
        1, // token_type
        erc20.address,
        total_tokens,
      ),
    )
      .to.emit(redPacket, "CreationSuccess")
      .withArgs(
        total_tokens,
        redpacketId,
        name,
        message,
        owner.address,
        creation_time,
        erc20.address,
        3,
        ifrandom,
        duration,
        hashLock,
      );

    return {
      redpacketId,
      message,
      total_tokens,
    };
  }

  describe("Normal Redpacket", async () => {
    it("create_red_packet() check require conditions", async () => {
      await expect(
        redPacket.connect(owner).create_red_packet(
          treeRoot,
          ZERO_BYTES32,
          3, // number
          true, // ifrandom
          1 * 24 * 60 * 60, // 1day
          "message", // message
          "Redpacket Name",
          1, // token_type
          erc20.address,
          2, // total_tokens
        ),
      ).to.revertedWith("#tokens > #packets");

      await expect(
        redPacket.connect(owner).create_red_packet(
          treeRoot,
          ZERO_BYTES32,
          0, // number
          true, // ifrandom
          1 * 24 * 60 * 60, // 1day
          "message", // message
          "Redpacket Name",
          1, // token_type
          erc20.address,
          parseUnits("300", 18), // total_tokens
        ),
      ).to.revertedWith("At least 1 recipient");

      await expect(
        redPacket.connect(owner).create_red_packet(
          treeRoot,
          ZERO_BYTES32,
          512, // number
          true, // ifrandom
          1 * 24 * 60 * 60, // 1day
          "message", // message
          "Redpacket Name",
          1, // token_type
          erc20.address,
          parseUnits("300", 18), // total_tokens
        ),
      ).to.revertedWith("At most 511 recipients");

      await expect(
        redPacket.connect(owner).create_red_packet(
          treeRoot,
          ZERO_BYTES32,
          3, // number
          true, // ifrandom
          1 * 24 * 60 * 60, // 1day
          "message", // message
          "Redpacket Name",
          2, // token_type
          erc20.address,
          parseUnits("300", 18), // total_tokens
        ),
      ).to.revertedWith("Unrecognizable token type");

      await expect(
        redPacket.connect(owner).create_red_packet(
          treeRoot,
          ZERO_BYTES32,
          3, // number
          true, // ifrandom
          1 * 24 * 60 * 60, // 1day
          "message", // message
          "Redpacket Name",
          1, // token_type
          erc20.address,
          parseUnits("0.3", 18), // total_tokens
        ),
      ).to.revertedWith("At least 0.1 for each user");

      await expect(
        redPacket.connect(owner).create_red_packet(
          treeRoot,
          ZERO_BYTES32,
          3, // number
          true, // ifrandom
          1 * 24 * 60 * 60, // 1day
          "message", // message
          "Redpacket Name",
          0, // token_type
          erc20.address,
          parseUnits("3", 18), // total_tokens
        ),
      ).to.revertedWith("No enough ETH");

      // @todo revertedWith("#received > #packets")

      const { redpacketId, total_tokens } = await createRedpacket("300", true);
      await expect(
        redPacket.connect(owner).create_red_packet(
          treeRoot,
          ZERO_BYTES32,
          3, // number
          true, // ifrandom
          1 * 24 * 60 * 60, // 1day
          "some message", // message
          "Redpacket Name",
          1, // token_type
          erc20.address,
          parseUnits("300", 18), // total_tokens
        ),
      ).to.revertedWith("Redpacket already exists");
    });

    it("create_red_packet() no password", async () => {
      const { redpacketId, total_tokens } = await createRedpacket("300", true);
      const redpacketData = await redPacket.redpacket_by_id(redpacketId);

      expect(redpacketData.creator).to.equal(owner.address);
      expect(redpacketData.lock).to.equal(ZERO_BYTES32);
      expect(redpacketData.merkleroot).to.equal(treeRoot);
    });

    it("claimOrdinaryRedpacket(): Shuold all member could claim.", async () => {
      const duration = 1 * 24 * 60 * 60;
      const { redpacketId, total_tokens } = await createRedpacket(
        "300",
        false,
        ZERO_BYTES32,
        duration,
      );

      const snapshotId = await ethers.provider.send("evm_snapshot", []);

      let merkleProof;

      merkleProof = merkleTree.getHexProof(hashToken(owner.address));

      await ethers.provider.send("evm_increaseTime", [duration]);
      await expect(
        redPacket
          .connect(owner)
          .claimOrdinaryRedpacket(redpacketId, merkleProof),
      ).to.revertedWith("Expired");
      await ethers.provider.send("evm_revert", [snapshotId]);

      merkleProof = merkleTree.getHexProof(hashToken(alice.address));
      await expect(
        redPacket
          .connect(owner)
          .claimOrdinaryRedpacket(redpacketId, merkleProof),
      ).to.revertedWith("Verification failed, forbidden");

      for (let user of [owner, alice, bob]) {
        const beforeBalance = await erc20.balanceOf(user.address);
        merkleProof = merkleTree.getHexProof(hashToken(user.address));
        await redPacket
          .connect(user)
          .claimOrdinaryRedpacket(redpacketId, merkleProof);
        const afterBalance = await erc20.balanceOf(user.address);
        expect(afterBalance - beforeBalance).to.equal(total_tokens / 3n);

        await expect(
          redPacket
            .connect(user)
            .claimOrdinaryRedpacket(redpacketId, merkleProof),
        ).to.revertedWith(user !== bob ? "Already claimed" : "Out of stock");
      }
    });

    it("refund(): Should refund after expired", async () => {
      const duration = 1 * 60 * 60;
      const { redpacketId, total_tokens } = await createRedpacket(
        "300",
        false,
        ZERO_BYTES32,
        duration,
      );

      const snapshotId = await ethers.provider.send("evm_snapshot", []);
      await expect(
        redPacket.connect(alice).refund(redpacketId),
      ).to.revertedWith("Creator Only");

      await expect(
        redPacket.connect(owner).refund(redpacketId),
      ).to.revertedWith("Not expired yet");

      // claim all tokens
      for (let user of [owner, alice, bob]) {
        const merkleProof = merkleTree.getHexProof(hashToken(user.address));
        await redPacket
          .connect(user)
          .claimOrdinaryRedpacket(redpacketId, merkleProof);
      }

      await ethers.provider.send("evm_increaseTime", [duration]);

      await expect(
        redPacket.connect(owner).refund(redpacketId),
      ).to.revertedWith("None left in the red packet");

      // revert to snapshot
      await ethers.provider.send("evm_revert", [snapshotId]);
      await ethers.provider.send("evm_increaseTime", [duration]);

      const beforeBalance = await erc20.balanceOf(owner.address);

      await expect(redPacket.connect(owner).refund(redpacketId))
        .to.emit(redPacket, "RefundSuccess")
        .withArgs(redpacketId, erc20.address, total_tokens, ZERO_BYTES32);

      const afterBalance = await erc20.balanceOf(owner.address);
      expect(afterBalance - beforeBalance).to.equal(total_tokens);
    });
  });

  describe("ZK Redpacket", async () => {
    it("create_red_packet() with password", async () => {
      const password = "This is a password";
      const hashLock = await calculatePublicSignals(password);
      const { redpacketId, total_tokens } = await createRedpacket(
        "300",
        true,
        hashLock,
      );
      const redpacketData = await redPacket.redpacket_by_id(redpacketId);

      expect(redpacketData.creator).to.equal(owner.address);
      expect(redpacketData.lock).to.equal(hashLock);
      expect(redpacketData.merkleroot).to.equal(treeRoot);
    });

    it("claimPasswordRedpacket(): Shuold all member could claim with correct password.", async () => {
      const correct_password = "This is a correct password";
      const hashLock = await calculatePublicSignals(correct_password);
      const { redpacketId, total_tokens } = await createRedpacket(
        "300",
        false,
        hashLock,
      );
      const { redpacketId: redpacketId2 } = await createRedpacket(
        "300",
        false,
        ZERO_BYTES32,
        1 * 24 * 60 * 60,
        "some other message",
      );

      let merkleProof;

      const wrong_password = "This is a wrong password";
      const { proof: wrong_zkproof, publicSignals: wrong_publicSignals } =
        await calculateZKProof(wrong_password);

      expect(toHex(BigInt(wrong_publicSignals[0]))).to.not.equal(hashLock);

      merkleProof = merkleTree.getHexProof(hashToken(owner.address));
      await expect(
        redPacket
          .connect(owner)
          .claimPasswordRedpacket(
            redpacketId2,
            merkleProof,
            wrong_zkproof.a,
            wrong_zkproof.b,
            wrong_zkproof.c,
          ),
      ).to.revertedWith("Not password redpacket");

      merkleProof = merkleTree.getHexProof(hashToken(owner.address));
      await expect(
        redPacket
          .connect(owner)
          .claimPasswordRedpacket(
            redpacketId,
            merkleProof,
            wrong_zkproof.a,
            wrong_zkproof.b,
            wrong_zkproof.c,
          ),
      ).to.revertedWith("ZK Verification failed, wrong password");

      const { proof: correct_zkproof, publicSignals } =
        await calculateZKProof(correct_password);

      expect(toHex(BigInt(publicSignals[0]))).to.equal(hashLock);

      const claimed_value = total_tokens / 3n;

      for (let user of [owner, alice, bob]) {
        const beforeBalance = await erc20.balanceOf(user.address);
        merkleProof = merkleTree.getHexProof(hashToken(user.address));
        await expect(
          redPacket
            .connect(user)
            .claimPasswordRedpacket(
              redpacketId,
              merkleProof,
              correct_zkproof.a,
              correct_zkproof.b,
              correct_zkproof.c,
            ),
        )
          .to.emit(redPacket, "ClaimSuccess")
          .withArgs(
            redpacketId,
            user.address,
            claimed_value,
            erc20.address,
            hashLock,
          );

        const afterBalance = await erc20.balanceOf(user.address);
        expect(afterBalance - beforeBalance).to.equal(claimed_value);
      }
    });

    it("refund(): Should refund after expired", async () => {
      const duration = 1 * 60 * 60;
      const password = "This is a password";
      const hashLock = await calculatePublicSignals(password);
      const { redpacketId, total_tokens } = await createRedpacket(
        "300",
        false,
        hashLock,
        duration,
      );

      await ethers.provider.send("evm_increaseTime", [duration]);

      const beforeBalance = await erc20.balanceOf(owner.address);

      await expect(redPacket.connect(owner).refund(redpacketId))
        .to.emit(redPacket, "RefundSuccess")
        .withArgs(redpacketId, erc20.address, total_tokens, hashLock);

      const afterBalance = await erc20.balanceOf(owner.address);
      expect(afterBalance - beforeBalance).to.equal(total_tokens);
    });
  });
});
