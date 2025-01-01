// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Interface for the Sharing Wish Vault contract.
 * This contract allows users to create vaults, donate funds, and claim or withdraw funds.
 */
interface ISharingWishVault {
    /**
     * Struct representing a Wish Vault.
     * This struct holds the details of a vault, including the message, funds, and recipients.
     */
    struct WishVault {
        address creator; // The creator of the vault.
        address token; // The token being donated.
        uint256 lockTime; // The time until funds can be withdrawn.
        uint256 totalAmount; // Total amount of funds in the vault (remaining).
        uint256 totalClaimedAmount; // Total amount of funds claimed by recipients.
        string message; // The content of the wish, typically a hash to save gas.
        mapping(address => uint256) maxClaimableAmounts; // Maximum claimable amount by each recipient, default is 0.
        mapping(address => uint256) claimedAmounts; // Amounts claimed by each recipient.
    }

    // Events
    event VaultCreated(uint256 indexed vaultId, address indexed creator, string message);
    event FundsDonated(
        uint256 indexed vaultId,
        address indexed donor,
        address token,
        uint256 amount
    );
    event VaultSettled(
        uint256 indexed vaultId,
        address indexed claimer,
        address token,
        uint256 maxClaimableAmount
    );
    event FundsClaimed(
        uint256 indexed vaultId,
        address indexed claimer,
        address token,
        uint256 amount
    );
    event FundsWithdrawn(
        uint256 indexed vaultId,
        address indexed withdrawer,
        address token,
        uint256 amount
    );
    event EmergencyModeToggled(bool mode);

    // Custom Errors
    error InvalidVaultId();
    error EmergencyModeActive();
    error EmergencyModeNotActive();
    error InvalidTokenAddress();
    error TokenNotAllowed();
    error InvalidAmount();
    error InsufficientBalance();
    error InvalidClaimer();
    error NoFundsToClaim();
    error LockPeriodNotExpired();
    error ETHTransferFailed();
    error ExceedsTotalAmount();
    error InvalidLockDuration();

    /**
     * @dev Creates a new vault with the given message
     * @param message The content of the wish
     * @param token The token address
     * @param lockDuration The duration for which the vault will be locked
     * @return vaultId The ID of the created vault
     */
    function createVault(
        string calldata message,
        address token,
        uint256 lockDuration
    ) external returns (uint256 vaultId);

    /**
     * Donates funds to a specific vault.
     * @param vaultId The ID of the vault to which funds are donated.
     * @param amount The amount of funds being donated.
     */
    function donate(uint256 vaultId, uint256 amount) external payable;

    /**
     * Admin audits and settles the vault, assigning a claimer address.
     * @param vaultId The ID of the vault being settled.
     * @param claimer The address of the recipient who will claim the funds.
     * @param amount The amount of funds to be assigned to the claimer.
     */
    function settle(uint256 vaultId, address claimer, uint256 amount) external;

    /**
     * Claims the funds from a specific vault.
     * @param vaultId The ID of the vault from which funds are claimed.
     */
    function claim(uint256 vaultId) external;

    /**
     * Allows the wishing user to withdraw funds from the vault after a lock period.
     * @param vaultId The ID of the vault.
     * @param amount The amount to withdraw.
     */
    function withdraw(uint256 vaultId, uint256 amount) external;

    /**
     * Admin can withdraw funds in case of emergencies.
     * @param vaultId The ID of the vault from which funds are withdrawn.
     * @param amount The amount of funds being withdrawn.
     */
    function emergencyWithdraw(uint256 vaultId, uint256 amount) external;

    /**
     * @dev Checks if a token is allowed in the vault.
     * @param token The address of the token to check.
     * @return true if the token is allowed, false otherwise.
     */
    function isAllowedToken(address token) external view returns (bool);

    /**
     * Adds a token to the list of allowed tokens.
     * @param token The address of the token to be added.
     */
    function addAllowedToken(address token) external;

    /**
     * Removes a token from the list of allowed tokens.
     * @param token The address of the token to be removed.
     */
    function removeAllowedToken(address token) external;

    /**
     * Toggles the emergency mode of the contract.
     */
    function toggleEmergencyMode() external;

    /**
     * @dev Get the claimed amount for a specific vault and claimer
     * @param vaultId The ID of the vault
     * @param claimer The address of the claimer
     * @return The claimed amount for the specified vault and claimer
     */
    function getClaimedAmount(uint256 vaultId, address claimer) external view returns (uint256);

    /**
     * @dev Get the maximum claimable amount for a specific vault and claimer
     * @param vaultId The ID of the vault
     * @param claimer The address of the claimer
     * @return The maximum claimable amount for the specified vault and claimer
     */
    function getMaxClaimableAmount(
        uint256 vaultId,
        address claimer
    ) external view returns (uint256);
}
