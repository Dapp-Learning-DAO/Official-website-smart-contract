const MerkleTree = require('./merkle-tree')
const { keccak256, encodePacked } = require('viem')

 class BalanceTree {

  constructor(balances) {
    this.tree = new MerkleTree(
      balances.map(({ account, amount }, index) => {
        return this.toNode(index, account, amount)
      })
    )
  }

  verifyProof(
    index,
    account,
    amount,
    proof,
    root
  ) {
    let pair = this.toNode(index, account, amount)
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item)
    }

    return pair.equals(root)
  }

  // keccak256(abi.encode(index, account, amount))
  toNode(index, account, amount) {
    return Buffer.from(
      keccak256(encodePacked(['uint256', 'address', 'uint256'], [index, account, amount])).slice(2),
      'hex'
    )
  }

  getHexRoot() {
    return this.tree.getHexRoot()
  }

  // returns the hex bytes32 values of the proof
  getProof(index, account, amount) {
    return this.tree.getHexProof(this.toNode(index, account, amount))
  }

}
module.exports = BalanceTree;