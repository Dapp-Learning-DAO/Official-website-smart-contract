// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../lib/TransferHelper.sol';
import './MerkleDistributor.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import 'hardhat/console.sol';

contract MerkleDistributorFactory is Ownable {
    // Keep track of all created distributors
    mapping(bytes32 => MerkleDistributor) public redpacket_by_id;

    event DistributorCreated(
        uint256 total,
        bytes32 id,
        string name,
        string message,
        address token_address,
        uint256 number,
        uint256 duration,
        address creator,
        uint256 creation_time
    );

    receive() external payable {}

    constructor() Ownable(msg.sender) {}

    function createDistributor(
        uint256 number,
        string memory message,
        string memory name,
        address token,
        uint256 tokenTotal,
        bytes32 merkleRoot,
        uint256 duration
    ) public {
        require(address(0) != token, 'Token');
        require(tokenTotal > 0, 'TokenTotal');
        MerkleDistributor distributor = _createDistributor(
            number,
            message,
            name,
            token,
            merkleRoot,
            duration,
            tokenTotal
        );
        TransferHelper.safeTransferFrom(token, msg.sender, address(distributor), tokenTotal);
    }

    function createDistributorWithEth(
        uint256 number,
        string memory message,
        string memory name,
        bytes32 merkleRoot,
        uint256 duration
    ) public payable {
        require(msg.value > 0, 'TotalAmount');
        MerkleDistributor distributor = _createDistributor(
            number,
            message,
            name,
            address(0),
            merkleRoot,
            duration,
            msg.value
        );
        TransferHelper.safeTransferETH(address(distributor), msg.value);
    }

    function _createDistributor(
        uint256 number,
        string memory message,
        string memory name,
        address token,
        bytes32 merkleRoot,
        uint256 duration,
        uint256 tokenTotal
    ) private returns (MerkleDistributor distributor) {
        bytes32 id = keccak256(abi.encodePacked(msg.sender, message));

        require(address(redpacket_by_id[id]) == address(0), 'Distributor already exists');
        distributor = new MerkleDistributor(
            number,
            message,
            name,
            token,
            merkleRoot,
            duration,
            msg.sender
        );

        redpacket_by_id[id] = distributor;
        emit DistributorCreated(
            tokenTotal,
            id,
            name,
            message,
            token,
            number,
            duration,
            msg.sender,
            block.timestamp
        );
    }

    function ownerWithdraw(address _token, uint256 _amount, address _recipient) external onlyOwner {
        if (_amount == 0) return;
        if (address(0) == _token) {
            TransferHelper.safeTransferETH(_recipient, _amount);
        } else {
            TransferHelper.safeTransfer(_token, _recipient, _amount);
        }
    }

    function batchTransferETH(
        address[] memory _receipts,
        uint256[] memory _amounts
    ) external payable {
        uint256 size = _receipts.length;
        require(size == _amounts.length, 'Size not match');
        for (uint256 i = 0; i < size; i++)
            TransferHelper.safeTransferETH(_receipts[i], _amounts[i]);
    }

    function batchTransfer(
        address _token,
        address[] memory _receipts,
        uint256[] memory _amounts
    ) external {
        uint256 size = _receipts.length;
        require(size == _amounts.length, 'Size not match');
        for (uint256 i = 0; i < size; i++)
            TransferHelper.safeTransferFrom(_token, msg.sender, _receipts[i], _amounts[i]);
    }
}
