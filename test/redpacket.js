const { ethers } = require('hardhat');

const keccak256 = require('keccak256');
const { expect } = require('chai');
const fs =require('fs');
//const tokens = require('./tokens.json');

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}



describe('redpacket', function () {

  let treeRoot;
  let erc20;
   let owner;
   let alice;
   let bob;


  
  // merkleTree = new MerkleTree(Object.entries(tokens).map(token => hashToken(...token)), keccak256, { sortPairs: true });
  describe('deploy', function () {
    before(async function() {
      [owner,alice, bob] = await ethers.getSigners();
      console.log(owner.address);
      console.log(alice.address);
      console.log(bob.address);
       erc20 = await deploy('TestERC20', "AAA token",'AAA', 100000000 );
     

            //---------------

       let balances = new Array();
       let valid = true
       for (const [key, value] of Object.entries(json)) {
    
        balances.push({ account: key, amount: value});
      }
      fileTree = new BalanceTree(balances);
      //console.log(balances);
   // })
    

    // Root
    const root = fileTree.getHexRoot().toString('hex')
    console.log('Reconstructed merkle root', root)
  
   
     
    const redPacketFactory = await ethers.getContractFactory('HappyRedPacket');
    const redPacket = await redPacketFactory.deploy();
    await redPacket.deployed();

      // Init red packet
    let initRecipt = await redPacket.initialize({
      // sometimes it will be fail if not
      gasLimit: 1483507
    });

    await initRecipt.wait();

    await erc20.transfer(distributor.address, 201);
    await erc20.transfer(distributorFile.address, 1000);

    });

    it('successful claim', async () => {
      const proof0 = tree.getProof(0, alice.address, ethers.BigNumber.from(100))
     
      await expect(distributor.connect(alice).claim(0, alice.address, 100, proof0))
        .to.emit(distributor, 'Claimed')
        .withArgs(0, alice.address, 100)
      const proof1 = tree.getProof(1, bob.address, ethers.BigNumber.from(101))
      await expect(distributor.connect(bob).claim(1, bob.address, 101, proof1))
        .to.emit(distributor, 'Claimed')
        .withArgs(1, bob.address, 101)
    })

 

  });

  

});
