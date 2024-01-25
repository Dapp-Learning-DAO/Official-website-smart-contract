pragma solidity ^0.8.0;

import './MerkleDistributor.sol';

contract MerkleDistributorFactory {
    // Keep track of all created distributors
    // MerkleDistributor[] public distributors;
    uint32 public nonce;

    mapping(uint32 => MerkleDistributor) redpacket_by_id;

    event DistributorCreated(
        address indexed distributorAddress,
        address indexed owner,
        uint32 nonce,
        string name,
        uint256 timestamp,
        address token,
        uint number,
        uint duration
    );

    function createDistributor(
        address token,
        bytes32 merkleRoot,
        string memory _name,
        uint _number,
        uint _duration
    ) public {
        nonce++;
        MerkleDistributor distributor = new MerkleDistributor(
            token,
            merkleRoot,
            _name,
            _number,
            _duration,
            msg.sender
        );
        redpacket_by_id[nonce] = distributor;
        emit DistributorCreated(
            address(distributor),
            msg.sender,
            nonce,
            _name,
            block.timestamp,
            token,
            _number,
            _duration
        );
    }

    function getDistributor(uint32 index) public view returns (MerkleDistributor) {
        return redpacket_by_id[index];
    }
}
