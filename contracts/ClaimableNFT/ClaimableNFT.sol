// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import './IClaimableNFT.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract ClaimableNFT is IClaimableNFT, ERC721, Ownable {
    using ECDSA for bytes32;

    uint256 public constant SIGNATURE_VALIDITY = 1 hours;
    address public validSigner;
    string public baseURI;
    uint256 public claimedTotal;
    mapping(address userAddress => uint256 tokenId) public claimedTokenIdBy;
    mapping(uint256 tokenId => address userAddress) public claimerBy;

    constructor(
        string memory _tokenName,
        string memory _tokenSymbol,
        address _validSigner,
        string memory _InitBaseURI
    ) ERC721(_tokenName, _tokenSymbol) Ownable(msg.sender) {
        validSigner = _validSigner;
        baseURI = _InitBaseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function claim(
        address _receiver,
        uint256 _signedAt,
        uint256 _tokenId,
        bytes calldata signature
    ) external {
        if (_signedAt < block.timestamp - SIGNATURE_VALIDITY) revert ExpiredSignature();
        if (hasUserClaimed(_receiver) || hasTokenClaimed(_tokenId)) revert AlreadyClaimed();

        if (!isValidSignature(_receiver, _signedAt, _tokenId, signature))
            revert IncorrectSignature();

        claimedTotal += 1;

        claimedTokenIdBy[_receiver] = _tokenId;
        claimerBy[_tokenId] = _receiver;

        _safeMint(_receiver, _tokenId);

        emit Locked(_tokenId);
        emit Claimed(msg.sender, _receiver, _tokenId);
    }

    function totalSupply() public view returns (uint256) {
        return claimedTotal;
    }

    function hasUserClaimed(address _user) public view returns (bool claimed) {
        return claimedTokenIdBy[_user] != 0;
    }

    function hasTokenClaimed(uint256 _tokenId) public view returns (bool claimed) {
        return claimerBy[_tokenId] != address(0);
    }

    function setValidSigner(address _validSigner) external onlyOwner {
        validSigner = _validSigner;
        emit ValidSignerChanged(_validSigner);
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit SetBaseURI(_newBaseURI);
    }

    /// @notice Checks the validity of the signature for the given params.
    function isValidSignature(
        address _receiver,
        uint256 _signedAt,
        uint256 _tokenId,
        bytes calldata _signature
    ) internal view returns (bool) {
        if (_signature.length != 65) revert IncorrectSignature();
        bytes32 message = keccak256(abi.encode(_receiver, _signedAt, _tokenId));
        return message.recover(_signature) == validSigner;
    }
}
