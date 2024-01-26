const { encodePacked, keccak256 } = require("viem");

function hashToken(account) {
    return Buffer.from(
        keccak256(encodePacked(["address"], [account])).slice(2),
        "hex",
    );
}

function convertZKSnarkCallData(calldata) {
    // console.log("calldata origin", calldata);
    const argv = calldata
        .replace(/["[\]\s]/g, "")
        .split(",");

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

module.exports = {
    hashToken,
    convertZKSnarkCallData,
};
