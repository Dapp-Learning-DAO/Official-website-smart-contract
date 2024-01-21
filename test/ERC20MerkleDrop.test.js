const { ethers } = require('hardhat');
const MerkleTree = require('./merkle-tree.js');
const BalanceTree = require('./balance-tree.js');
const keccak256 = require('keccak256');
const { expect } = require('chai');
const fs = require('fs');
//const tokens = require('./tokens.json');

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}

function hashToken(index, account, amount) {
  return Buffer.from(ethers.utils.solidityKeccak256(['uint256', 'address', 'uint256'], [index, account, amount]).slice(2), 'hex')
}


describe('ERC20MerkleDrop', function () {

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
  describe('Mint all elements', function () {
    before(async function () {
      [owner, alice, bob] = await ethers.getSigners();
      console.log(owner.address);
      console.log(alice.address);
      console.log(bob.address);
      erc20 = await deploy('TestERC20', "AAA token", 'AAA', 100000000);
      tree = new BalanceTree([
        { account: alice.address, amount: ethers.BigNumber.from(100) },
        { account: bob.address, amount: ethers.BigNumber.from(101) },
      ])

      let json = JSON.parse(fs.readFileSync('./test/erc20.json', { encoding: 'utf8' }))

      if (typeof json !== 'object') throw new Error('Invalid JSON')


      //console.log(JSON.stringify(json));


      //---------------

      let balances = new Array();
      let valid = true
      for (const [key, value] of Object.entries(json)) {

        balances.push({ account: key, amount: value });
      }
      fileTree = new BalanceTree(balances);

      // Root
      const root = fileTree.getHexRoot().toString('hex')
      console.log('Reconstructed merkle root', root)
      //defactory factory
      distributorFactory = await deploy("MerkleDistributorFactory");


      //discribute total 
      const distributeTotal = ethers.BigNumber.from(201);
      //distribute erc20
      await erc20.approve(distributorFactory.address, distributeTotal);
      await distributorFactory.createDistributor(erc20.address, distributeTotal, tree.getHexRoot(), 3600);
      distributorErc20 = await ethers.getContractAt("MerkleDistributor", await distributorFactory.getDistributor(1));
      console.log("distributorErc20 address", distributorErc20.address);
      //discribute eth
      await distributorFactory.createDistributorWithEth(tree.getHexRoot(), 3600, { value: distributeTotal });
      distributorEth = await ethers.getContractAt("MerkleDistributor", await distributorFactory.getDistributor(2));
      console.log("distributorEth address", distributorEth.address);
    });




    it('expect claim fail:error amount', async () => {
      //eg:error amount
      let proof = tree.getProof(0, alice.address, ethers.BigNumber.from(200))
      await expect(distributorErc20.connect(alice).claim(0, 200, proof)).to.be.revertedWith("MerkleDistributor: Invalid proof.");
      //eg:error amount
      proof = tree.getProof(0, alice.address, ethers.BigNumber.from(100))
      await expect(distributorErc20.connect(alice).claim(0, 200, proof)).to.be.revertedWith("MerkleDistributor: Invalid proof.");
    })


    it('check claim erc20.expect success', async () => {
      const proof0 = tree.getProof(0, alice.address, ethers.BigNumber.from(100))

      //claim
      await expect(distributorErc20.connect(alice).claim(0, 100, proof0))
        .to.emit(distributorErc20, 'Claimed')
        .withArgs(0, alice.address, 100)
      const proof1 = tree.getProof(1, bob.address, ethers.BigNumber.from(101))
      await expect(distributorErc20.connect(bob).claim(1, 101, proof1))
        .to.emit(distributorErc20, 'Claimed')
        .withArgs(1, bob.address, 101)


      //check balance
      let balance = await erc20.balanceOf(alice.address);
      expect(balance.toString()).to.equal("100");
      balance = await erc20.balanceOf(bob.address);
      expect(balance.toString()).to.equal("101");
    })


    it('check claim eth.expect success', async () => {
      const proof0 = tree.getProof(0, alice.address, ethers.BigNumber.from(100))

      //claim
      await expect(distributorEth.connect(alice).claim(0, 100, proof0))
        .to.emit(distributorEth, 'Claimed')
        .withArgs(0, alice.address, 100)
      const proof1 = tree.getProof(1, bob.address, ethers.BigNumber.from(101))
      await expect(distributorEth.connect(bob).claim(1, 101, proof1))
        .to.emit(distributorEth, 'Claimed')
        .withArgs(1, bob.address, 101)


      //check balance
      let balance = await erc20.balanceOf(alice.address);
      expect(balance.toString()).to.equal("100");
      balance = await erc20.balanceOf(bob.address);
      expect(balance.toString()).to.equal("101");
    })



    it('expect claim fail:error amount', async () => {
      //eg: claim twice
      let proof = tree.getProof(0, alice.address, ethers.BigNumber.from(100))
      await expect(distributorErc20.connect(alice).claim(0, 100, proof)).to.be.revertedWith("MerkleDistributor:already claimed");
    })

  });

});
