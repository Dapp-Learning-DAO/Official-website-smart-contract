// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IClaimableNFT {
    event ValidSignerChanged(address _newValidSigner);
    event Locked(uint256 _tokenId);
    event SetBaseURI(string _tokenId);
    event Claimed(address _sender, address _receiver, uint256 _tokenId);

    error AlreadyClaimed();

    error ExpiredSignature();

    error IncorrectFee(uint256 paid, uint256 requiredAmount);

    error IncorrectSender();

    error IncorrectSignature();
}
