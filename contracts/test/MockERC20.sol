// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';

/**
 * @title MockERC20
 * @dev Implementation of an ERC20 token with permit functionality for testing purposes
 */
contract MockERC20 is ERC20, ERC20Permit, Ownable {
    uint8 private _decimals;
    uint256 public INITIAL_SUPPLY;

    /**
     * @dev Constructor
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals_ Number of decimals
     * @param initial_supply Initial token supply
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initial_supply
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(msg.sender) {
        _decimals = decimals_;
        INITIAL_SUPPLY = initial_supply * (10 ** uint256(decimals_));
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @dev Returns the number of decimals used for token amounts
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mints new tokens
     * @param amount The amount of tokens to mint
     */
    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    /**
     * @dev Batch mints tokens to multiple addresses
     * @param recipients Array of addresses to receive the minted tokens
     * @param amounts Array of token amounts to mint, corresponding to each recipient
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(
            recipients.length == amounts.length,
            'MockERC20: recipients and amounts length mismatch'
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
}
