import * as hre from "hardhat";
import deployments from "./sablier.json"

async function main() {
    const { ethers } = hre;
    const signers = await ethers.getSigners();
    const signer = signers[0];
    const chainId = await ethers.provider.getNetwork().then(network => network.chainId);
    const contracts = deployments[chainId];
    const token = "0x016b496974422684ac4474d1d8b75a16b02c14cd";
    const DLStreamContract = await ethers.getContractAt("DlStream", contracts.dl);

    // await DLStreamContract.setOwner(signer.address);

    // const contractERC20 = new ethers.Contract(token, erc20Abi, signer);
    // const approveRes = await contractERC20.approve(contracts.dl, "1000000000000000000000000000000000000000000000000");
    // console.log(approveRes?.hash)

    // const createStream = async () => {
    //     const currentTimestamp = Math.floor(Date.now() / 1000) + 20

    //     const res = await DLStreamContract.createLinearStream({
    //         sender: signer.address,
    //         recipient: '0xAD3A45194eC873d8d6ED908590CF59F7309d6a5f',
    //         totalAmount: "1000000000000000000000",
    //         asset: token,
    //         cancelable: true,
    //         transferable: true,
    //         range: {
    //             cliff: 1704045153,
    //             start: 1703958753,
    //             end: 1706550753
    //         },
    //     }, 1, {
    //         gasLimit: 2000000
    //     })

    //     await res?.wait(2);
    // }

    // await createStream();

    // const token = "0x016b496974422684ac4474d1d8b75a16b02c14cd";

    // // const contractERC20 = new ethers.Contract(token, erc20Abi, signer);
    // // const approveRes = await contractERC20.approve(dlSablier, "1000000000000000000000000000000000000000000000000");
    // // console.log(approveRes?.hash)

    // const contract = new ethers.Contract(dlSablier, dlSablierAbi, signer);

    // const res = await contract.createLinearStream("1000000000000000000000000000", "0xad3a45194ec873d8d6ed908590cf59f7309d6a5f");
    // console.log(res?.hash)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});