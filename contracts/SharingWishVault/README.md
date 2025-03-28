# SharingWishVault

`SharingWishVault` 是一个基于以太坊的智能合约，用于管理愿望分享和资金分配。它允许用户创建愿望资金库（`Vault`），接受捐赠，并通过管理员（`Admin`）审核后分配资金给指定的接收者（`Claimer`）。

## 合约地址

### Optimism 网络

| 合约名称         | 地址                                         |
| ---------------- | -------------------------------------------- |
| SharingWishVault | `0xb2012522f8aD0f90CA1A30c903B5993c4fAB301A` |

### Optimism Sepolia 网络

| 合约名称         | 地址                                         |
| ---------------- | -------------------------------------------- |
| SharingWishVault | `0x765278450757f25330169a648CB6478909003283` |
| MockERC20        | `0xe89672e34DBA796A3Bf6E2cA860910765Dcc393E` |

## 主要特性

1. **Vault 创建**

    - 用户可以创建带有消息的 Vault
    - 支持 `ETH` 和指定的 `ERC20` 代币
    - 每个 Vault 都有唯一的 `ID` 和锁定期

2. **资金管理**

    - 支持多人向 Vault 捐赠（`donate`）
    - 资金锁定期（`lockTime`）为 14 天
    - 捐赠者可在锁定期后按捐赠比例提取（`withdraw`）未分配的资金

3. **资金分配**

    - 管理员可以设置资金接收者（`settle`）
    - 支持多次分配和领取
    - 接收者可以随时领取（`claim`）已分配的资金

4. **捐赠者功能**

    - 跟踪每个捐赠者的捐赠金额
    - 支持按捐赠比例提取未分配资金
    - 提供捐赠者信息查询接口

5. **安全特性**
    - 紧急模式（`Emergency Mode`）开关
    - 管理员紧急提款功能
    - 防重入（`ReentrancyGuard`）保护
    - 支持的代币白名单

## 合约接口

### 核心功能

1. **创建 Vault**

```solidity
function createVault(string calldata message, address token, uint256 lockDuration, uint256 amount) external payable returns (uint256 vaultId)
```

-   创建新的 Vault
-   参数：消息内容、指定接受代币地址（`token`）、锁定期（`lockDuration`）和初始捐赠金额（`amount`）
-   返回：`Vault ID`

2. **捐赠资金**

```solidity
function donate(uint256 vaultId, uint256 amount) external payable
```

-   向指定 Vault 捐赠资金
-   支持 `ETH` 和 `ERC20` 代币
-   记录捐赠者的捐赠金额

3. **分配资金**

```solidity
function settle(uint256 vaultId, address claimer, uint256 amount, bool autoClaim) external
```

-   管理员分配资金给指定接收者（`Claimer`）
-   可以多次分配
-   可选择是否自动领取（`autoClaim`）

4. **领取资金**

```solidity
function claim(uint256 vaultId) external
```

-   接收者领取已分配的资金

5. **提取资金**

```solidity
function withdraw(uint256 vaultId, uint256 amount) external
```

-   捐赠者在锁定期后按捐赠比例提取未分配资金
-   提取金额不能超过捐赠者的可提取份额

### 查询功能

1. **查询已领取金额**

```solidity
function getClaimedAmount(uint256 vaultId, address claimer) external view returns (uint256)
```

-   查询指定接收者已领取的金额（`claimedAmount`）

2. **查询最大可领取金额**

```solidity
function getMaxClaimableAmount(uint256 vaultId, address claimer) external view returns (uint256)
```

-   查询指定接收者可领取的最大金额（`maxClaimableAmount`）

3. **查询捐赠者信息**

```solidity
function getDonorInfo(uint256 vaultId, address donor) external view returns (uint256 donatedAmount, uint256 withdrawableAmount)
```

-   查询捐赠者的捐赠金额和可提取金额
-   可提取金额根据捐赠比例计算

### 管理功能

1. **代币白名单管理**

```solidity
function addAllowedToken(address token) external
function removeAllowedToken(address token) external
function isAllowedToken(address token) external view returns (bool)
```

2. **紧急功能**

```solidity
function toggleEmergencyMode() external
function emergencyWithdraw(uint256 vaultId, uint256 amount) external
```

## FLow

```mermaid
graph TD
    A[User] -->|createVault| B(Create Vault)
    B -->|Return vaultId| C[Vault Created]

    D[Donor] -->|donate| E(Donate)
    E -->|Update totalAmount & donorAmounts| F[Funds Deposited]

    G[Admin] -->|settle| H(Allocate Funds)
    H -->|Set maxClaimableAmount| I[Funds Allocated]

    J[Claimer] -->|claim| K(Request Claim)
    K -->|Check maxClaimableAmount| L{Has Claimable Amount?}
    L -->|Yes| M[Transfer to Claimer]
    L -->|No| N[Claim Failed]

    O[Donor] -->|After lockTime| P(withdraw)
    P -->|Check lockTime & donorShare| Q{Can Withdraw?}
    Q -->|Yes| R[Withdraw Funds]
    Q -->|No| S[Withdraw Failed]

    T[Admin] -->|Emergency| U(toggleEmergencyMode)
    U -->|Enable Emergency Mode| V[Pause Operations]
    V -->|emergencyWithdraw| W[Emergency Withdraw]
```

## Events

1. `VaultCreated`: Vault 创建事件
2. `FundsDonated`: 资金捐赠事件
3. `VaultSettled`: 资金分配事件
4. `FundsClaimed`: 资金领取事件
5. `FundsWithdrawn`: 资金提取事件
6. `EmergencyModeToggled`: 紧急模式切换事件

## Errors

-   `InvalidVaultId`: 无效的 Vault ID
-   `EmergencyModeActive`: 紧急模式已激活
-   `EmergencyModeNotActive`: 紧急模式未激活
-   `InsufficientBalance`: 余额不足
-   `InvalidClaimer`: 无效的接收者地址
-   `NoFundsToClaim`: 无可领取资金
-   `LockPeriodNotExpired`: 锁定期未到
-   `ETHTransferFailed`: ETH 转账失败
-   `ExceedsTotalAmount`: 超出总金额
