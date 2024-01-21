// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IERC20.sol";
import "../lib/TransferHelper.sol";
import "./MerkleProof.sol";
import "./IMerkleDistributor.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MerkleDistributor is IMerkleDistributor, Ownable, ReentrancyGuard {
    address public immutable override token;
    bytes32 public immutable override merkleRoot;
    uint256 public expireTime;
    uint256 public claimedToken;
    mapping(uint256 => uint256) private claimedBitMap;

    event Refund(address to, uint refund_balance);

    receive() external payable {}

    constructor(
        address _token,
        bytes32 _merkleRoot,
        uint256 _duration,
        address _owner
    ) Ownable(_owner) {
        token = _token;
        merkleRoot = _merkleRoot;
        expireTime = block.timestamp + _duration;
    }

    function isClaimed(uint256 index) public view override returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[claimedWordIndex] =
            claimedBitMap[claimedWordIndex] |
            (1 << claimedBitIndex);
    }

    function claim(
        uint256 index,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external override nonReentrant {
        require(expireTime > block.timestamp, "Expired");
        require(!isClaimed(index), "MerkleDistributor:already claimed");

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, msg.sender, amount));
        require(
            MerkleProof.verify(merkleProof, merkleRoot, node),
            "MerkleDistributor: Invalid proof."
        );

        // Mark it claimed and send the token.
        _setClaimed(index);

        _sendToken(token, amount, msg.sender);
        emit Claimed(index, msg.sender, amount);
    }

    function refund(
        address _token,
        address _to
    ) external nonReentrant onlyOwner {
        require(expireTime < block.timestamp, "Only expire");

        uint256 amount = 0;
        if (address(0) == _token) {
            amount = address(this).balance;
        } else {
            amount = IERC20(_token).balanceOf(address(this));
        }

        if (amount == 0) return;
        _sendToken(_token, amount, _to);
        emit Refund(_to, amount);
    }

    function _sendToken(
        address _token,
        uint256 _amount,
        address _recipient
    ) private {
        if (_amount == 0) return;
        if (address(0) == _token) {
            TransferHelper.safeTransferETH(_recipient, _amount);
        } else {
            TransferHelper.safeTransfer(_token, _recipient, _amount);
        }
    }
}
