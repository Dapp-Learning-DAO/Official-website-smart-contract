// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/TransferHelper.sol";
import "./MerkleDistributor.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract MerkleDistributorFactory is Ownable {
    // Keep track of all created distributors
    mapping(string => MerkleDistributor) public redpacketByName;

    event DistributorCreated(
        address indexed distributorAddress,
        address indexed owner,
        string name,
        uint256 timestamp,
        address token,
        uint duration
    );

    receive() external payable {}

    constructor() Ownable(msg.sender) {}

    function createDistributor(
        address token,
        string memory name,
        uint256 tokenTotal,
        bytes32 merkleRoot,
        uint256 duration
    ) public {
        require(address(0) != token, "Token");
        require(tokenTotal > 0, "TokenTotal");
        MerkleDistributor distributor = _createDistributor(
            token,
            name,
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
        string memory name,
        bytes32 merkleRoot,
        uint256 duration
    ) public payable {
        require(msg.value > 0, "TotalAmount");
        MerkleDistributor distributor = _createDistributor(
            address(0),
            name,
            merkleRoot,
            duration
        );
        TransferHelper.safeTransferETH(address(distributor), msg.value);
    }

    function _createDistributor(
        address token,
        string memory name,
        bytes32 merkleRoot,
        uint256 duration
    ) private returns (MerkleDistributor) {
        require(address(redpacketByName[name]) == address(0), "Duplicate name");
        MerkleDistributor distributor = new MerkleDistributor(
            token,
            merkleRoot,
            duration,
            msg.sender
        );

        redpacketByName[name] = distributor;
        emit DistributorCreated(
            address(distributor),
            msg.sender,
            name,
            block.timestamp,
            token,
            duration
        );
        return distributor;
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
