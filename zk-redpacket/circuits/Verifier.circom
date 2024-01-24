pragma circom 2.0.0;

include "MerkleTreeChecker.circom";
include "datahash.circom";

template Verifier(levels) {

    signal input commitment;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;

    signal input in;
    signal input hash;

    component poseidonHasher = PoseidonHasher();
    component merkleTreeChecker = MerkleTreeChecker(levels);
    poseidonHasher.in <== in;
    poseidonHasher.hash <== hash;

     merkleTreeChecker.leaf <== commitment;
    for (var i = 0; i < levels; i++) {
        merkleTreeChecker.pathElements[i] <== pathElements[i];
        merkleTreeChecker.pathIndices[i] <== pathIndices[i];
    }

    root <== merkleTreeChecker.root;
}

component main = Verifier(20);