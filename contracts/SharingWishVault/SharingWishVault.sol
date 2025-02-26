// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol';
import './ISharingWishVault.sol';

/**
 * @title SharingWishVault
 * @dev Implementation of the ISharingWishVault interface
 */
contract SharingWishVault is ISharingWishVault, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constant address for ETH
    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // Mapping from vault ID to WishVault struct
    mapping(uint256 => WishVault) public vaultById;

    // Total number of vaults created
    uint256 public totalVaultCount;

    // Minimum lock time for funds (3 days)
    uint256 public constant MIN_LOCK_TIME = 3 days;

    // Mapping for allowed tokens
    mapping(address => bool) public allowedTokensMap;

    // Emergency mode flag
    bool public emergencyMode;

    modifier vaultExists(uint256 vaultId) {
        if (vaultById[vaultId].creator == address(0)) revert InvalidVaultId();
        _;
    }

    modifier notInEmergencyMode() {
        if (emergencyMode) revert EmergencyModeActive();
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        totalVaultCount = 0;
        emergencyMode = false;
    }

    /**
     * @dev Internal function to create a new vault
     * @param message The content of the wish
     * @param token The token address
     * @param lockDuration The duration for which the vault will be locked
     * @return vaultId The ID of the created vault
     */
    function _createVault(
        string calldata message,
        address token,
        uint256 lockDuration
    ) internal returns (uint256 vaultId) {
        if (token == address(0)) revert InvalidTokenAddress();
        if (!isAllowedToken(token)) revert TokenNotAllowed();
        if (lockDuration < MIN_LOCK_TIME) revert InvalidLockDuration();

        totalVaultCount++;
        // Generate vault ID using keccak256 hash of creator address and message
        vaultId = uint256(keccak256(abi.encodePacked(msg.sender, message)));

        // Check if vault with this ID already exists
        if (vaultById[vaultId].creator != address(0)) revert VaultAlreadyExists();

        uint256 lockTime = block.timestamp + lockDuration;
        WishVault storage vault = vaultById[vaultId];
        vault.message = message;
        vault.creator = msg.sender;
        vault.token = token;
        vault.lockTime = lockTime;

        emit VaultCreated(vaultId, msg.sender, token, lockTime, message);

        return vaultId;
    }

    /**
     * @dev Creates a new vault with the given message and initial donation
     * @param message The content of the wish
     * @param token The token address
     * @param lockDuration The duration for which the vault will be locked
     * @param amount The amount to donate during creation
     * @return vaultId The ID of the created vault
     */
    function createVault(
        string calldata message,
        address token,
        uint256 lockDuration,
        uint256 amount
    ) external payable notInEmergencyMode returns (uint256 vaultId) {
        vaultId = _createVault(message, token, lockDuration);

        if (amount > 0) {
            _donate(vaultId, amount);
        } else if (msg.value > 0) {
            revert InvalidAmount();
        }

        return vaultId;
    }

    /**
     * @dev Creates a new vault with initial donation using permit
     * @param message The message for the vault
     * @param token The token address for donations
     * @param lockDuration The duration for which funds will be locked
     * @param amount The amount of tokens to donate
     * @param deadline The deadline for the permit
     * @param v The v value of the permit signature
     * @param r The r value of the permit signature
     * @param s The s value of the permit signature
     */
    function createVaultWithPermit(
        string calldata message,
        address token,
        uint256 lockDuration,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external notInEmergencyMode returns (uint256 vaultId) {
        vaultId = _createVault(message, token, lockDuration);

        // Then handle the permit donation if amount > 0
        if (amount > 0) {
            _donateWithPermit(vaultId, amount, deadline, v, r, s);
        }

        return vaultId;
    }

    /**
     * @dev Donates funds to a specific vault
     * @param vaultId The ID of the vault
     * @param amount The amount to donate
     */
    function donate(
        uint256 vaultId,
        uint256 amount
    ) external payable notInEmergencyMode vaultExists(vaultId) {
        _donate(vaultId, amount);
    }

    /**
     * @dev Donates funds to a specific vault using permit signature
     * @param vaultId The ID of the vault
     * @param amount The amount to donate
     * @param deadline The deadline for the permit signature
     * @param v The v component of the permit signature
     * @param r The r component of the permit signature
     * @param s The s component of the permit signature
     */
    function donateWithPermit(
        uint256 vaultId,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external notInEmergencyMode vaultExists(vaultId) {
        _donateWithPermit(vaultId, amount, deadline, v, r, s);
    }

    function _donate(uint256 vaultId, uint256 amount) internal {
        if (amount == 0 && msg.value == 0) revert InvalidAmount();

        WishVault storage vault = vaultById[vaultId];
        if (vault.token == ETH_ADDRESS) {
            if (msg.value != amount) revert InvalidAmount();
        } else {
            if (msg.value > 0) revert InvalidAmount();
            IERC20(vault.token).safeTransferFrom(msg.sender, address(this), amount);
        }

        vault.totalAmount += amount;
        vault.donorAmounts[msg.sender] += amount; // 记录捐赠者的捐赠金额
        emit FundsDonated(vaultId, msg.sender, vault.token, amount);
    }

    /**
     * @dev Internal function to handle donation with permit
     * @param vaultId The ID of the vault
     * @param amount The amount to donate
     * @param deadline The deadline for the permit signature
     * @param v The v component of the permit signature
     * @param r The r component of the permit signature
     * @param s The s component of the permit signature
     */
    function _donateWithPermit(
        uint256 vaultId,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal {
        if (amount == 0) revert InvalidAmount();

        WishVault storage vault = vaultById[vaultId];
        if (vault.token == ETH_ADDRESS) revert InvalidTokenAddress();

        // Execute permit
        IERC20Permit(vault.token).permit(msg.sender, address(this), amount, deadline, v, r, s);

        // Transfer tokens using the approved allowance
        IERC20(vault.token).safeTransferFrom(msg.sender, address(this), amount);

        vault.totalAmount += amount;
        vault.donorAmounts[msg.sender] += amount; // 记录捐赠者的捐赠金额
        emit FundsDonated(vaultId, msg.sender, vault.token, amount);
    }

    /**
     * @dev Admin settles the vault by assigning funds to a claimer
     * @param vaultId The ID of the vault
     * @param claimer The address of the claimer
     * @param maxClaimableAmount The maximum amount to be claimed, if 0 then claimer can't claim any funds
     */
    function settle(
        uint256 vaultId,
        address claimer,
        uint256 maxClaimableAmount,
        bool autoClaim
    ) external onlyOwner notInEmergencyMode nonReentrant vaultExists(vaultId) {
        if (claimer == address(0)) revert InvalidClaimer();

        WishVault storage vault = vaultById[vaultId];
        if (maxClaimableAmount > vault.totalAmount) revert InsufficientBalance();

        vault.maxClaimableAmounts[claimer] = maxClaimableAmount + vault.claimedAmounts[claimer];
        emit VaultSettled(vaultId, claimer, vault.token, maxClaimableAmount);

        // Auto claim if there are funds to claim
        if (maxClaimableAmount > 0 && autoClaim) {
            _claim(vaultId, claimer);
        }
    }

    /**
     * @dev Claims funds from a vault
     * @param vaultId The ID of the vault
     */
    function claim(uint256 vaultId) external nonReentrant notInEmergencyMode vaultExists(vaultId) {
        _claim(vaultId, msg.sender);
    }

    /**
     * @dev Internal function to claim funds from a vault
     * @param vaultId The ID of the vault
     * @param claimer The address that will receive the funds
     */
    function _claim(uint256 vaultId, address claimer) internal {
        WishVault storage vault = vaultById[vaultId];
        uint256 remainingClaimable = vault.maxClaimableAmounts[claimer] -
            vault.claimedAmounts[claimer];
        if (remainingClaimable == 0) revert NoFundsToClaim();

        uint256 claimableAmount = remainingClaimable;
        if (claimableAmount > vault.totalAmount) {
            claimableAmount = vault.totalAmount;
        }

        // Update state before external calls
        vault.claimedAmounts[claimer] += claimableAmount;
        vault.totalAmount -= claimableAmount;
        vault.totalClaimedAmount += claimableAmount;

        // Transfer funds
        if (vault.token == ETH_ADDRESS) {
            (bool success, ) = payable(claimer).call{value: claimableAmount}('');
            if (!success) revert ETHTransferFailed();
        } else {
            IERC20(vault.token).safeTransfer(claimer, claimableAmount);
        }

        emit FundsClaimed(vaultId, claimer, vault.token, claimableAmount);
    }

    /**
     * @dev Withdraws funds from a vault after lock period
     * @param vaultId The ID of the vault
     * @param amount The amount to withdraw
     */
    function withdraw(
        uint256 vaultId,
        uint256 amount
    ) external nonReentrant notInEmergencyMode vaultExists(vaultId) {
        if (amount == 0) revert InvalidAmount();

        WishVault storage vault = vaultById[vaultId];
        if (block.timestamp < vault.lockTime) revert LockPeriodNotExpired();

        // 检查捐赠者是否有捐赠记录
        uint256 donorAmount = vault.donorAmounts[msg.sender];
        if (donorAmount == 0) revert InsufficientBalance();

        // 计算捐赠者可以提取的最大金额（按照捐赠比例）
        uint256 totalDonated = vault.totalAmount + vault.totalClaimedAmount;
        uint256 donorShare = (donorAmount * vault.totalAmount) / totalDonated;

        // 确保提取金额不超过捐赠者的份额
        if (amount > donorShare) revert InsufficientBalance();

        // 更新状态
        vault.totalAmount -= amount;
        vault.donorAmounts[msg.sender] -= amount;

        // 转账
        if (vault.token == ETH_ADDRESS) {
            (bool success, ) = payable(msg.sender).call{value: amount}('');
            if (!success) revert ETHTransferFailed();
        } else {
            IERC20(vault.token).safeTransfer(msg.sender, amount);
        }

        emit FundsWithdrawn(vaultId, msg.sender, vault.token, amount);
    }

    /**
     * @dev Admin withdraws funds in case of emergency
     * @param vaultId The ID of the vault
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(
        uint256 vaultId,
        uint256 amount
    ) external nonReentrant onlyOwner vaultExists(vaultId) {
        if (!emergencyMode) revert EmergencyModeNotActive();
        if (amount == 0) revert InvalidAmount();

        WishVault storage vault = vaultById[vaultId];
        if (vault.totalAmount < amount) revert InsufficientBalance();

        // Update state before external calls
        vault.totalAmount -= amount;

        // Transfer funds
        if (vault.token == ETH_ADDRESS) {
            (bool success, ) = payable(msg.sender).call{value: amount}('');
            if (!success) revert ETHTransferFailed();
        } else {
            IERC20(vault.token).safeTransfer(msg.sender, amount);
        }

        emit FundsWithdrawn(vaultId, msg.sender, vault.token, amount);
    }

    function addAllowedToken(address token) external onlyOwner notInEmergencyMode {
        allowedTokensMap[token] = true;
    }

    function removeAllowedToken(address token) external onlyOwner notInEmergencyMode {
        allowedTokensMap[token] = false;
    }

    /**
     * @dev Get donor information for a specific vault
     * @param vaultId The ID of the vault
     * @param donor The address of the donor
     * @return donatedAmount The amount donated by the donor
     * @return withdrawableAmount The amount that can be withdrawn by the donor
     */
    function getDonorInfo(
        uint256 vaultId,
        address donor
    )
        external
        view
        vaultExists(vaultId)
        returns (uint256 donatedAmount, uint256 withdrawableAmount)
    {
        WishVault storage vault = vaultById[vaultId];
        donatedAmount = vault.donorAmounts[donor];

        // 如果锁定期未结束或者没有捐赠记录，可提取金额为0
        if (block.timestamp < vault.lockTime || donatedAmount == 0) {
            return (donatedAmount, 0);
        }

        // 计算捐赠者可以提取的最大金额（按照捐赠比例）
        uint256 totalDonated = vault.totalAmount + vault.totalClaimedAmount;
        withdrawableAmount = (donatedAmount * vault.totalAmount) / totalDonated;

        return (donatedAmount, withdrawableAmount);
    }

    function isAllowedToken(address token) public view returns (bool) {
        return allowedTokensMap[token];
    }

    function toggleEmergencyMode() external onlyOwner {
        emergencyMode = !emergencyMode;
        emit EmergencyModeToggled(emergencyMode);
    }

    /**
     * @dev Get the claimed amount for a specific vault and claimer
     * @param vaultId The ID of the vault
     * @param claimer The address of the claimer
     */
    function getClaimedAmount(uint256 vaultId, address claimer) external view returns (uint256) {
        return vaultById[vaultId].claimedAmounts[claimer];
    }

    /**
     * @dev Get the maximum claimable amount for a specific vault and claimer
     * @param vaultId The ID of the vault
     * @param claimer The address of the claimer
     */
    function getMaxClaimableAmount(
        uint256 vaultId,
        address claimer
    ) external view returns (uint256) {
        return vaultById[vaultId].maxClaimableAmounts[claimer];
    }
}
