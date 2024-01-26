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
const { utils } = require("ethers");

const ZERO_BYTES32 =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

async function deploy(name, deployer, ...params) {
    const Contract = await ethers.getContractFactory(name);
    return await Contract.connect(deployer)
        .deploy(...params)
        .then((f) => f.deployed());
}

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
        erc20 = await deploy(
            "SimpleToken",
            owner,
            "AAA token",
            "AAA",
            18,
            total_supply,
        );

        merkleTree = new MerkleTree(
            [owner, alice, bob].map((user) => hashToken(user.address)),
            keccak256,
            { sortPairs: true },
        );

        // Root
        treeRoot = merkleTree.getHexRoot().toString("hex");
        console.log("MerkleTree root", treeRoot);

        groth16Verifier = await deploy("Groth16Verifier", owner);
        redPacket = await deploy("HappyRedPacket", owner);

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
    ) {
        const message = "some message";
        const total_tokens = utils.parseUnits(totalAmount, 18);
        const redpacketId = keccak256(
            encodePacked(["address", "string"], [owner.address, message]),
        );
        const tx = await redPacket.connect(owner).create_red_packet(
            treeRoot,
            hashLock,
            3, // number
            ifrandom, // ifrandom
            1 * 24 * 60 * 60, // 1day
            message, // message
            "Redpacket Name",
            1, // token_type
            erc20.address,
            total_tokens,
        );
        await tx.wait();

        return {
            redpacketId,
            message,
            total_tokens,
        };
    }

    describe("Normal Redpacket", async () => {
        it("create_red_packet() no password", async () => {
            const { redpacketId, total_tokens } = await createRedpacket(
                "300",
                true,
            );
            const redpacketData = await redPacket.redpacket_by_id(redpacketId);

            expect(redpacketData.creator).to.equal(owner.address);
            expect(redpacketData.lock).to.equal(ZERO_BYTES32);
            expect(redpacketData.merkleroot).to.equal(treeRoot);
        });

        it("claimOrdinaryRedpacket(): Shuold all member could claim.", async () => {
            const { redpacketId, total_tokens } = await createRedpacket("300");

            for (let user of [owner, alice, bob]) {
                const beforeBalance = await erc20.balanceOf(user.address);
                const merkleProof = merkleTree.getHexProof(
                    hashToken(user.address),
                );
                const tx = await redPacket
                    .connect(user)
                    .claimOrdinaryRedpacket(redpacketId, merkleProof);
                await tx.wait();
                const afterBalance = await erc20.balanceOf(user.address);
                expect(afterBalance.sub(beforeBalance)).to.equal(
                    total_tokens.div(3),
                );
            }
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

            const wrong_password = "This is a wrong password";

            const { proof: wrong_zkproof, publicSignals: wrong_publicSignals } =
                await calculateZKProof(wrong_password);

            expect(toHex(BigInt(wrong_publicSignals[0]))).to.not.equal(
                hashLock,
            );

            const { proof: correct_zkproof, publicSignals } =
                await calculateZKProof(correct_password);

            expect(toHex(BigInt(publicSignals[0]))).to.equal(hashLock);

            const claimed_value = total_tokens.div(3);

            for (let user of [owner, alice, bob]) {
                const beforeBalance = await erc20.balanceOf(user.address);
                const merkleProof = merkleTree.getHexProof(
                    hashToken(user.address),
                );
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
                expect(afterBalance.sub(beforeBalance)).to.equal(claimed_value);
            }
        });
    });
});
