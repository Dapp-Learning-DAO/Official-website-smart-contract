// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/TransferHelper.sol";
import "./MerkleDistributor.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract MerkleDistributorFactory is Ownable {
    // Keep track of all created distributors
    // MerkleDistributor[] public distributors;
    uint32 public nonce;
    mapping(uint32 => MerkleDistributor) redpacket_by_id;

    event DistributorCreated(
        address indexed distributorAddress,
        address indexed owner,
        uint32 nonce,
        uint256 timestamp,
        address token,
        uint duration
    );

    receive() external payable {}

    constructor() Ownable(msg.sender) {}

    function createDistributor(
        address token,
        uint256 tokenTotal,
        bytes32 merkleRoot,
        uint256 duration
    ) public {
        require(address(0) != token, "Token");
        require(tokenTotal > 0, "TokenTotal");
        MerkleDistributor distributor = _createDistributor(
            token,
            merkleRoot,
            duration
        );
        TransferHelper.safeTransferFrom(
            token,
            msg.sender,
            address(distributor),
            tokenTotal
        );
    }

    function createDistributorWithEth(
        bytes32 merkleRoot,
        uint256 duration
    ) public payable {
        require(msg.value > 0, "TotalAmount");
        MerkleDistributor distributor = _createDistributor(
            address(0),
            merkleRoot,
            duration
        );
        TransferHelper.safeTransferETH(address(distributor), msg.value);
    }

    function _createDistributor(
        address token,
        bytes32 merkleRoot,
        uint256 duration
    ) private returns (MerkleDistributor) {
        nonce++;
        MerkleDistributor distributor = new MerkleDistributor(
            token,
            merkleRoot,
            duration,
            msg.sender
        );
        redpacket_by_id[nonce] = distributor;
        emit DistributorCreated(
            address(distributor),
            msg.sender,
            nonce,
            block.timestamp,
            token,
            duration
        );
        return distributor;
    }

    function getDistributor(
        uint32 index
    ) public view returns (MerkleDistributor) {
        return redpacket_by_id[index];
    }

    function ownerWithdraw(
        address _token,
        uint256 _amount,
        address _recipient
    ) external onlyOwner {
        if (_amount == 0) return;
        if (address(0) == _token) {
            TransferHelper.safeTransferETH(_recipient, _amount);
        } else {
            TransferHelper.safeTransfer(_token, _recipient, _amount);
        }
    }
}
