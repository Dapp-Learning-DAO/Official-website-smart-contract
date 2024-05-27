// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import './IDLWarcraft3NFT.sol';
import '../lib/Counters.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract DLWarcraft3NFT is IDLWarcraft3NFT, ERC721, Ownable {
    using ECDSA for bytes32;
    using Counters for Counters.Counter;
    Counters.Counter private tokenIdCounter;

    uint256 public constant RANKLENGTH = 917;
    uint256 public constant SIGNATURE_VALIDITY = 1 hours;
    address public validSigner;
    string public baseURI;
    uint256 public claimedTotal;
    mapping(uint256 => bool) public validRank;
    mapping(uint256 => string) public tokenURIs;
    mapping(address => bool) public claimedBitMap;

    mapping(address userAddress => uint256 tokenId) public claimedTokenIdBy;

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
        uint256 _seed,
        bytes calldata signature
    ) external {
        if (_signedAt < block.timestamp - SIGNATURE_VALIDITY) revert ExpiredSignature();
        if (hasUserClaimed(_receiver)) revert AlreadyClaimed();

        if (!isValidSignature(_receiver, _seed, _signedAt, signature)) revert IncorrectSignature();

        tokenIdCounter.increment();
        uint256 tokenId = tokenIdCounter.current();
        claimedTokenIdBy[_receiver] = tokenId;

        uint random = rand(_seed) % RANKLENGTH;
        uint256 rank = getFreeRank(random);
        string memory url = uint2str(rank);

        _safeMint(_receiver, tokenId);
        _setTokenURI(tokenId, url);

        validRank[rank] = true;
        claimedBitMap[msg.sender] = true;

        emit Locked(tokenId);
        emit Claimed(msg.sender, _receiver, tokenId, url);
    }

    function totalSupply() public view returns (uint256) {
        return claimedTotal;
    }

    function hasUserClaimed(address _user) public view returns (bool claimed) {
        return claimedTokenIdBy[_user] != 0;
    }

    function setValidSigner(address _validSigner) external onlyOwner {
        validSigner = _validSigner;
        emit ValidSignerChanged(_validSigner);
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit SetBaseURI(_newBaseURI);
    }

    function getFreeRank(uint256 randomNumber) internal view returns (uint256) {
        uint256 loopIndex = randomNumber;
        while (validRank[loopIndex]) {
            loopIndex = loopIndex + 1;

            if (loopIndex >= RANKLENGTH) {
                loopIndex = loopIndex % RANKLENGTH;
            }
        }

        return loopIndex;
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        _requireOwned(tokenId);
        tokenURIs[tokenId] = _tokenURI;
    }

    function rand(uint userSeed) public view returns (uint) {
        return
            uint(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        block.number,
                        userSeed,
                        blockhash(block.number)
                    )
                )
            );
    }

    function uint2str(uint256 _i) public pure returns (string memory str) {
        if (_i == 0) {
            return '0';
        }

        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }

        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + (j % 10)));
            j /= 10;
        }

        str = string(bstr);
    }

    /// @notice Checks the validity of the signature for the given params.
    function isValidSignature(
        address _receiver,
        uint256 _seed,
        uint256 _signedAt,
        bytes calldata _signature
    ) internal view returns (bool) {
        if (_signature.length != 65) revert IncorrectSignature();
        bytes32 message = keccak256(
            abi.encode(_receiver, _seed, _signedAt, block.chainid, address(this))
        );
        return MessageHashUtils.toEthSignedMessageHash(message).recover(_signature) == validSigner;
    }
}
