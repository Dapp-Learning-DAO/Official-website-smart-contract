const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SharingWishVault", function () {
  let owner, alice, bob, charlie;
  let sharingWishVault, sharingWishVaultAddress;
  let mockToken, mockTokenAddress;
  const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const MIN_LOCK_TIME = 3 * 24 * 60 * 60; // 3 days in seconds, matching contract

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MTK", 18, 1000000);
    await mockToken.waitForDeployment();
    mockTokenAddress = await mockToken.getAddress();

    // Deploy SharingWishVault
    const SharingWishVault =
      await ethers.getContractFactory("SharingWishVault");
    sharingWishVault = await SharingWishVault.deploy(owner.address);
    await sharingWishVault.waitForDeployment();
    sharingWishVaultAddress = await sharingWishVault.getAddress();

    // Add mock token to allowed tokens
    await sharingWishVault.connect(owner).addAllowedToken(mockTokenAddress);
    await sharingWishVault.connect(owner).addAllowedToken(ETH_ADDRESS);

    // Mint tokens for testing
    await mockToken.connect(alice).mint(ethers.parseEther("1000"));
    await mockToken.connect(bob).mint(ethers.parseEther("1000"));
    await mockToken
      .connect(alice)
      .approve(sharingWishVaultAddress, ethers.MaxUint256);
    await mockToken
      .connect(bob)
      .approve(sharingWishVaultAddress, ethers.MaxUint256);
  });

  describe("Initialization", function () {
    it("Should initialize with correct owner", async function () {
      expect(await sharingWishVault.owner()).to.equal(owner.address);
    });

    it("Should initialize with emergency mode disabled", async function () {
      expect(await sharingWishVault.emergencyMode()).to.be.false;
    });

    it("Should initialize with correct allowed tokens", async function () {
      expect(await sharingWishVault.isAllowedToken(mockTokenAddress)).to.be
        .true;
      expect(await sharingWishVault.isAllowedToken(ETH_ADDRESS)).to.be.true;
      expect(await sharingWishVault.isAllowedToken(ZERO_ADDRESS)).to.be.false;
    });
  });

  describe("Vault Creation", function () {
    it("Should create vault with valid parameters", async function () {
      const tx = await sharingWishVault
        .connect(alice)
        .createVault("Test Message", mockTokenAddress, MIN_LOCK_TIME);
      const receipt = await tx.wait();
      const vaultId = (await sharingWishVault.totalVaultCount()) - 1n;

      const vault = await sharingWishVault.vaults(vaultId);
      expect(vault.creator).to.equal(alice.address);
      expect(vault.token).to.equal(mockTokenAddress);
      expect(vault.message).to.equal("Test Message");
      expect(vault.lockTime).to.be.greaterThanOrEqual(
        Math.floor(Date.now() / 1000) + MIN_LOCK_TIME,
      );
    });

    it("Should revert when creating vault with lockDuration less than MIN_LOCK_TIME", async function () {
      await expect(
        sharingWishVault
          .connect(alice)
          .createVault("Test Message", mockTokenAddress, MIN_LOCK_TIME - 1),
      ).to.be.revertedWithCustomError(sharingWishVault, "InvalidLockDuration");
    });

    it("Should revert when creating vault with non-allowed token", async function () {
      await expect(
        sharingWishVault
          .connect(alice)
          .createVault("Test Message", ZERO_ADDRESS, MIN_LOCK_TIME),
      ).to.be.revertedWithCustomError(sharingWishVault, "InvalidTokenAddress");
    });

    it("Should revert vault creation in emergency mode", async function () {
      await sharingWishVault.connect(owner).toggleEmergencyMode();
      await expect(
        sharingWishVault
          .connect(alice)
          .createVault("Test Message", mockTokenAddress, MIN_LOCK_TIME),
      ).to.be.revertedWithCustomError(sharingWishVault, "EmergencyModeActive");
    });
  });

  describe("Donations", function () {
    let vaultId;

    beforeEach(async function () {
      const tx = await sharingWishVault
        .connect(alice)
        .createVault("Test Message", mockTokenAddress, MIN_LOCK_TIME);
      const receipt = await tx.wait();
      vaultId = (await sharingWishVault.totalVaultCount()) - 1n;
    });

    it("Should accept ERC20 token donations", async function () {
      const amount = ethers.parseEther("100");
      await expect(sharingWishVault.connect(bob).donate(vaultId, amount))
        .to.emit(sharingWishVault, "FundsDonated")
        .withArgs(vaultId, bob.address, mockTokenAddress, amount);
    });

    it("Should correctly track total amount after multiple donations", async function () {
      // Create a new vault for this test
      const tx = await sharingWishVault
        .connect(alice)
        .createVault("Test Message 2", mockTokenAddress, MIN_LOCK_TIME);
      const newVaultId = (await sharingWishVault.totalVaultCount()) - 1n;

      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("50");

      await sharingWishVault.connect(bob).donate(newVaultId, amount1);
      await sharingWishVault.connect(bob).donate(newVaultId, amount2);

      const vault = await sharingWishVault.vaults(newVaultId);
      expect(vault[3]).to.equal(amount1 + amount2);
    });

    it("Should accept ETH donations", async function () {
      const ethVaultTx = await sharingWishVault
        .connect(alice)
        .createVault("ETH Vault", ETH_ADDRESS, MIN_LOCK_TIME);
      const ethVaultReceipt = await ethVaultTx.wait();
      const ethVaultId = (await sharingWishVault.totalVaultCount()) - 1n;

      const amount = ethers.parseEther("1");
      await expect(
        sharingWishVault
          .connect(bob)
          .donate(ethVaultId, amount, { value: amount }),
      )
        .to.emit(sharingWishVault, "FundsDonated")
        .withArgs(ethVaultId, bob.address, ETH_ADDRESS, amount);
    });

    it("Should revert donation with invalid amount", async function () {
      await expect(
        sharingWishVault.connect(bob).donate(vaultId, 0),
      ).to.be.revertedWithCustomError(sharingWishVault, "InvalidAmount");
    });
  });

  describe("Claims and Withdrawals", function () {
    let vaultId;
    const donationAmount = ethers.parseEther("100");

    beforeEach(async function () {
      const tx = await sharingWishVault
        .connect(alice)
        .createVault("Test Message", mockTokenAddress, MIN_LOCK_TIME);
      const receipt = await tx.wait();
      vaultId = (await sharingWishVault.totalVaultCount()) - 1n;

      await sharingWishVault.connect(bob).donate(vaultId, donationAmount);
      await sharingWishVault
        .connect(owner)
        .settle(vaultId, charlie.address, donationAmount, false); // Set autoClaim to false
    });

    it("Should allow claiming settled amounts", async function () {
      await expect(sharingWishVault.connect(charlie).claim(vaultId))
        .to.emit(sharingWishVault, "FundsClaimed")
        .withArgs(vaultId, charlie.address, mockTokenAddress, donationAmount);
    });

    it("Should auto-claim when settling with autoClaim enabled", async function () {
      // Create new vault and donate
      const tx = await sharingWishVault
        .connect(alice)
        .createVault("Auto Claim Test", mockTokenAddress, MIN_LOCK_TIME);
      const newVaultId = (await sharingWishVault.totalVaultCount()) - 1n;
      await sharingWishVault.connect(bob).donate(newVaultId, donationAmount);

      // Get initial balance
      const initialBalance = await mockToken.balanceOf(charlie.address);

      // Settle with autoClaim enabled
      await expect(
        sharingWishVault
          .connect(owner)
          .settle(newVaultId, charlie.address, donationAmount, true),
      )
        .to.emit(sharingWishVault, "VaultSettled")
        .withArgs(newVaultId, charlie.address, mockTokenAddress, donationAmount)
        .and.to.emit(sharingWishVault, "FundsClaimed")
        .withArgs(
          newVaultId,
          charlie.address,
          mockTokenAddress,
          donationAmount,
        );

      // Get final balance
      const finalBalance = await mockToken.balanceOf(charlie.address);
      expect(finalBalance - initialBalance).to.equal(donationAmount);

      // Get vault data
      const vault = await sharingWishVault.vaults(newVaultId);
      expect(vault[3]).to.equal(0n); // totalAmount
      expect(vault[4]).to.equal(donationAmount); // totalClaimedAmount
    });

    it("Should not auto-claim when settling with autoClaim disabled", async function () {
      // Create new vault and donate
      const tx = await sharingWishVault
        .connect(alice)
        .createVault("No Auto Claim Test", mockTokenAddress, MIN_LOCK_TIME);
      const newVaultId = (await sharingWishVault.totalVaultCount()) - 1n;
      await sharingWishVault.connect(bob).donate(newVaultId, donationAmount);

      // Get initial balance
      const initialBalance = await mockToken.balanceOf(charlie.address);

      // Settle with autoClaim disabled
      await expect(
        sharingWishVault
          .connect(owner)
          .settle(newVaultId, charlie.address, donationAmount, false),
      )
        .to.emit(sharingWishVault, "VaultSettled")
        .withArgs(newVaultId, charlie.address, mockTokenAddress, donationAmount)
        .and.not.to.emit(sharingWishVault, "FundsClaimed");

      // Get final balance
      const finalBalance = await mockToken.balanceOf(charlie.address);
      expect(finalBalance).to.equal(initialBalance);

      // Get vault data
      const vault = await sharingWishVault.vaults(newVaultId);
      expect(vault[3]).to.equal(donationAmount); // totalAmount
      expect(vault[4]).to.equal(0n); // totalClaimedAmount
    });

    it("Should not auto-claim when maxClaimableAmount is 0", async function () {
      // Create new vault and donate
      const tx = await sharingWishVault
        .connect(alice)
        .createVault("Zero Amount Test", mockTokenAddress, MIN_LOCK_TIME);
      const newVaultId = (await sharingWishVault.totalVaultCount()) - 1n;
      await sharingWishVault.connect(bob).donate(newVaultId, donationAmount);

      // Get initial balance
      const initialBalance = await mockToken.balanceOf(charlie.address);

      // Settle with zero amount but autoClaim enabled
      await expect(
        sharingWishVault
          .connect(owner)
          .settle(newVaultId, charlie.address, 0, true),
      )
        .to.emit(sharingWishVault, "VaultSettled")
        .withArgs(newVaultId, charlie.address, mockTokenAddress, 0)
        .and.not.to.emit(sharingWishVault, "FundsClaimed");

      // Get final balance
      const finalBalance = await mockToken.balanceOf(charlie.address);
      expect(finalBalance).to.equal(initialBalance);

      // Get vault data
      const vault = await sharingWishVault.vaults(newVaultId);
      expect(vault[3]).to.equal(donationAmount); // totalAmount
      expect(vault[4]).to.equal(0n); // totalClaimedAmount
    });

    it("Should correctly track total amount after multiple donations", async function () {
      // Create a new vault for this test
      const tx = await sharingWishVault
        .connect(alice)
        .createVault("Test Message 2", mockTokenAddress, MIN_LOCK_TIME);
      const newVaultId = (await sharingWishVault.totalVaultCount()) - 1n;

      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("50");

      await sharingWishVault.connect(bob).donate(newVaultId, amount1);
      await sharingWishVault.connect(bob).donate(newVaultId, amount2);

      const vault = await sharingWishVault.vaults(newVaultId);
      expect(vault[3]).to.equal(amount1 + amount2);
    });

    it("Should correctly track claimed amounts after multiple settlements", async function () {
      // Create a new vault for this test
      const tx = await sharingWishVault
        .connect(alice)
        .createVault("Test Message 2", mockTokenAddress, MIN_LOCK_TIME);
      const newVaultId = (await sharingWishVault.totalVaultCount()) - 1n;

      const amount1 = ethers.parseEther("40");
      const amount2 = ethers.parseEther("30");
      const totalAmount = amount1 + amount2;

      // Donate total amount first
      await sharingWishVault.connect(bob).donate(newVaultId, totalAmount);

      // Get initial balance
      const initialBalance = await mockToken.balanceOf(charlie.address);

      // First settlement and claim
      await sharingWishVault
        .connect(owner)
        .settle(newVaultId, charlie.address, amount1, false);
      await sharingWishVault.connect(charlie).claim(newVaultId);

      // Check intermediate state
      let vault = await sharingWishVault.vaults(newVaultId);
      expect(vault[3]).to.equal(totalAmount - amount1); // totalAmount should be reduced by amount1
      expect(vault[4]).to.equal(amount1); // totalClaimedAmount should be amount1

      // Check balance after first claim
      let currentBalance = await mockToken.balanceOf(charlie.address);
      expect(currentBalance - initialBalance).to.equal(amount1);

      // Second settlement with remaining amount
      await sharingWishVault
        .connect(owner)
        .settle(newVaultId, charlie.address, amount2, false); // Only settle the remaining amount
      await sharingWishVault.connect(charlie).claim(newVaultId);

      // Check final state
      vault = await sharingWishVault.vaults(newVaultId);
      expect(vault[3]).to.equal(0n); // totalAmount should be 0
      expect(vault[4]).to.equal(totalAmount); // totalClaimedAmount should be total

      // Check final balance
      currentBalance = await mockToken.balanceOf(charlie.address);
      expect(currentBalance - initialBalance).to.equal(totalAmount);
    });

    it("Should correctly handle settlement and claims", async function () {
      // Create a new vault for this test
      const tx = await sharingWishVault
        .connect(alice)
        .createVault("Test Message 5", mockTokenAddress, MIN_LOCK_TIME);
      const newVaultId = (await sharingWishVault.totalVaultCount()) - 1n;

      const amount = ethers.parseEther("100");

      // First donate enough funds
      await sharingWishVault.connect(bob).donate(newVaultId, amount);

      // Settle and claim full amount
      await sharingWishVault
        .connect(owner)
        .settle(newVaultId, charlie.address, amount, false);
      await sharingWishVault.connect(charlie).claim(newVaultId);

      const vault = await sharingWishVault.vaults(newVaultId);
      expect(vault[4]).to.equal(amount);
      expect(vault[3]).to.equal(0n);
    });

    it("Should revert claiming more than settled amount", async function () {
      await sharingWishVault.connect(charlie).claim(vaultId);
      await expect(
        sharingWishVault.connect(charlie).claim(vaultId),
      ).to.be.revertedWithCustomError(sharingWishVault, "NoFundsToClaim");
    });

    it("Should allow withdrawal after lock period", async function () {
      await time.increase(MIN_LOCK_TIME + 1);
      await expect(
        sharingWishVault.connect(alice).withdraw(vaultId, donationAmount),
      )
        .to.emit(sharingWishVault, "FundsWithdrawn")
        .withArgs(vaultId, alice.address, mockTokenAddress, donationAmount);
    });

    it("Should revert withdrawal before lock period", async function () {
      await expect(
        sharingWishVault.connect(alice).withdraw(vaultId, donationAmount),
      ).to.be.revertedWithCustomError(sharingWishVault, "LockPeriodNotExpired");
    });
  });

  describe("Emergency Functions", function () {
    let vaultId;
    const donationAmount = ethers.parseEther("100");

    beforeEach(async function () {
      const tx = await sharingWishVault
        .connect(alice)
        .createVault("Test Message", mockTokenAddress, MIN_LOCK_TIME);
      const receipt = await tx.wait();
      vaultId = (await sharingWishVault.totalVaultCount()) - 1n;
      await sharingWishVault.connect(bob).donate(vaultId, donationAmount);
    });

    it("Should allow emergency withdrawal in emergency mode", async function () {
      await sharingWishVault.connect(owner).toggleEmergencyMode();
      await expect(
        sharingWishVault
          .connect(owner)
          .emergencyWithdraw(vaultId, donationAmount),
      )
        .to.emit(sharingWishVault, "FundsWithdrawn")
        .withArgs(vaultId, owner.address, mockTokenAddress, donationAmount);
    });

    it("Should revert emergency withdrawal when not in emergency mode", async function () {
      await expect(
        sharingWishVault
          .connect(owner)
          .emergencyWithdraw(vaultId, donationAmount),
      ).to.be.revertedWithCustomError(
        sharingWishVault,
        "EmergencyModeNotActive",
      );
    });

    it("Should revert normal operations in emergency mode", async function () {
      await sharingWishVault.connect(owner).toggleEmergencyMode();
      await expect(
        sharingWishVault
          .connect(alice)
          .createVault("Test Message", mockTokenAddress, MIN_LOCK_TIME),
      ).to.be.revertedWithCustomError(sharingWishVault, "EmergencyModeActive");
    });
  });

  describe("Token Management", function () {
    it("Should allow owner to add allowed token", async function () {
      const newToken = ZERO_ADDRESS;
      await sharingWishVault.connect(owner).addAllowedToken(newToken);
      expect(await sharingWishVault.isAllowedToken(newToken)).to.be.true;
    });

    it("Should allow owner to remove allowed token", async function () {
      await sharingWishVault
        .connect(owner)
        .removeAllowedToken(mockTokenAddress);
      expect(await sharingWishVault.isAllowedToken(mockTokenAddress)).to.be
        .false;
    });

    it("Should revert when non-owner adds token", async function () {
      await expect(
        sharingWishVault.connect(alice).addAllowedToken(ZERO_ADDRESS),
      )
        .to.be.revertedWithCustomError(
          sharingWishVault,
          "OwnableUnauthorizedAccount",
        )
        .withArgs(alice.address);
    });
  });
});
