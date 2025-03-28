const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SharingWishVault", function () {
  let owner, alice, bob, charlie, david;
  let sharingWishVault, sharingWishVaultAddress;
  let mockToken, mockTokenAddress;
  const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const MIN_LOCK_TIME = 1 * 24 * 60 * 60; // 1 days in seconds, matching contract

  beforeEach(async function () {
    [owner, alice, bob, charlie, david] = await ethers.getSigners();

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
    await mockToken.connect(charlie).mint(ethers.parseEther("1000"));
    await mockToken.connect(david).mint(ethers.parseEther("1000"));

    await mockToken
      .connect(alice)
      .approve(sharingWishVaultAddress, ethers.MaxUint256);
    await mockToken
      .connect(bob)
      .approve(sharingWishVaultAddress, ethers.MaxUint256);
    await mockToken
      .connect(charlie)
      .approve(sharingWishVaultAddress, ethers.MaxUint256);
    await mockToken
      .connect(david)
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
      const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const receipt = await tx.wait();
      const vaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

      const vault = await sharingWishVault.vaultById(vaultId);
      expect(vault.creator).to.equal(alice.address);
      expect(vault.token).to.equal(mockTokenAddress);
      expect(vault.message).to.equal(message);
      expect(vault.lockTime).to.be.greaterThanOrEqual(
        Math.floor(Date.now() / 1000) + MIN_LOCK_TIME,
      );
    });

    it("Should revert when creating vault with lockDuration less than MIN_LOCK_TIME", async function () {
      const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
      await expect(
        sharingWishVault
          .connect(alice)
          .createVault(message, mockTokenAddress, MIN_LOCK_TIME - 1, 0),
      ).to.be.revertedWithCustomError(sharingWishVault, "InvalidLockDuration");
    });

    it("Should revert when creating vault with non-allowed token", async function () {
      const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
      await expect(
        sharingWishVault
          .connect(alice)
          .createVault(message, ZERO_ADDRESS, MIN_LOCK_TIME, 0),
      ).to.be.revertedWithCustomError(sharingWishVault, "InvalidTokenAddress");
    });

    it("Should revert vault creation in emergency mode", async function () {
      const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
      await sharingWishVault.connect(owner).toggleEmergencyMode();
      await expect(
        sharingWishVault
          .connect(alice)
          .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0),
      ).to.be.revertedWithCustomError(sharingWishVault, "EmergencyModeActive");
    });

    it("Should create vault with initial donation", async function () {
      const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
      const donateAmount = ethers.parseEther("50");
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, donateAmount);
      const receipt = await tx.wait();
      const vaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

      const vault = await sharingWishVault.vaultById(vaultId);
      expect(vault.creator).to.equal(alice.address);
      expect(vault.token).to.equal(mockTokenAddress);
      expect(vault.message).to.equal(message);
      expect(vault.totalAmount).to.equal(donateAmount);
    });

    it("Should create vault with ETH donation", async function () {
      const message = "ETH Message";
      const donateAmount = ethers.parseEther("1");
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, ETH_ADDRESS, MIN_LOCK_TIME, donateAmount, {
          value: donateAmount,
        });
      const receipt = await tx.wait();
      const vaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

      const vault = await sharingWishVault.vaultById(vaultId);
      expect(vault.creator).to.equal(alice.address);
      expect(vault.token).to.equal(ETH_ADDRESS);
      expect(vault.totalAmount).to.equal(donateAmount);
    });
  });

  describe("Create Vault with Permit", function () {
    const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
    const donationAmount = ethers.parseUnits("100", 18);
    const deadline = ethers.MaxUint256;

    it("Should create vault with initial donation using permit", async function () {
      // Get the current nonce for the creator
      const nonce = await mockToken.nonces(alice.address);

      // Create the permit signature
      const permitData = {
        owner: alice.address,
        spender: sharingWishVaultAddress,
        value: donationAmount,
        nonce: nonce,
        deadline: deadline,
      };

      // Sign the permit
      const signature = await alice.signTypedData(
        // Domain
        {
          name: await mockToken.name(),
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: mockTokenAddress,
        },
        // Types
        {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        permitData,
      );

      const { v, r, s } = ethers.Signature.from(signature);

      // Create vault with permit
      const tx = await sharingWishVault
        .connect(alice)
        .createVaultWithPermit(
          message,
          mockTokenAddress,
          MIN_LOCK_TIME,
          donationAmount,
          deadline,
          v,
          r,
          s,
        );
      const receipt = await tx.wait();
      const vaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

      // Check vault details
      const vault = await sharingWishVault.vaultById(vaultId);
      expect(vault.message).to.equal(message);
      expect(vault.creator).to.equal(alice.address);
      expect(vault.token).to.equal(mockTokenAddress);
      expect(vault.totalAmount).to.equal(donationAmount);

      // Verify events
      const vaultCreatedEvent = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "VaultCreated",
      );
      expect(vaultCreatedEvent).to.not.be.undefined;

      const fundsDonatedEvent = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "FundsDonated",
      );
      expect(fundsDonatedEvent).to.not.be.undefined;
      expect(fundsDonatedEvent.args.amount).to.equal(donationAmount);
    });

    it("Should create vault without initial donation", async function () {
      const tx = await sharingWishVault.connect(alice).createVaultWithPermit(
        message,
        mockTokenAddress,
        MIN_LOCK_TIME,
        0, // No initial donation
        deadline,
        0, // v
        ethers.ZeroHash, // r
        ethers.ZeroHash, // s
      );
      const receipt = await tx.wait();
      const vaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

      // Check vault details
      const vault = await sharingWishVault.vaultById(vaultId);
      expect(vault.message).to.equal(message);
      expect(vault.creator).to.equal(alice.address);
      expect(vault.token).to.equal(mockTokenAddress);
      expect(vault.totalAmount).to.equal(0);

      // Should only have VaultCreated event
      const events = receipt.logs.filter(
        (log) => log.fragment && log.fragment.name === "FundsDonated",
      );
      expect(events.length).to.equal(0);
    });

    it("Should revert with expired permit", async function () {
      const expiredDeadline = (await time.latest()) - 1000; // Set deadline in the past

      const { v, r, s } = await getPermitSignature(
        alice,
        mockToken,
        sharingWishVaultAddress,
        donationAmount,
        expiredDeadline,
      );

      await expect(
        sharingWishVault
          .connect(alice)
          .createVaultWithPermit(
            message,
            mockTokenAddress,
            MIN_LOCK_TIME,
            donationAmount,
            expiredDeadline,
            v,
            r,
            s,
          ),
      ).to.be.revertedWithCustomError(mockToken, "ERC2612ExpiredSignature");
    });
  });

  describe("Donations", function () {
    let vaultId;

    beforeEach(async function () {
      const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const receipt = await tx.wait();
      vaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );
    });

    it("Should accept ERC20 token donations", async function () {
      const amount = ethers.parseEther("100");
      await expect(sharingWishVault.connect(bob).donate(vaultId, amount))
        .to.emit(sharingWishVault, "FundsDonated")
        .withArgs(vaultId, bob.address, mockTokenAddress, amount);
    });

    it("Should correctly track total amount after multiple donations", async function () {
      // Create a new vault for this test
      const message = "Test Message 2";
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const newVaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("50");

      await sharingWishVault.connect(bob).donate(newVaultId, amount1);
      await sharingWishVault.connect(david).donate(newVaultId, amount2);

      const vault = await sharingWishVault.vaultById(newVaultId);
      expect(vault.totalAmount).to.equal(amount1 + amount2);
    });

    it("Should accept ETH donations", async function () {
      const message = "ETH Vault";
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, ETH_ADDRESS, MIN_LOCK_TIME, 0);
      const receipt = await tx.wait();
      const ethVaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

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

  describe("Donations with Permit", function () {
    let vaultId;
    const donationAmount = ethers.parseUnits("100", 18);
    const deadline = ethers.MaxUint256;

    beforeEach(async function () {
      // Create a vault first
      const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const receipt = await tx.wait();
      vaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );
    });

    it("Should accept donations with valid permit signature", async function () {
      // Get the current nonce for the donor
      const nonce = await mockToken.nonces(bob.address);

      // Get the domain separator
      const domainSeparator = await mockToken.DOMAIN_SEPARATOR();

      // Create the permit signature
      const permitData = {
        owner: bob.address,
        spender: sharingWishVaultAddress,
        value: donationAmount,
        nonce: nonce,
        deadline: deadline,
      };

      // Sign the permit
      const signature = await bob.signTypedData(
        // Domain
        {
          name: await mockToken.name(),
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: mockTokenAddress,
        },
        // Types
        {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        permitData,
      );

      const { v, r, s } = ethers.Signature.from(signature);

      // Donate with permit
      await expect(
        sharingWishVault
          .connect(bob)
          .donateWithPermit(vaultId, donationAmount, deadline, v, r, s),
      )
        .to.emit(sharingWishVault, "FundsDonated")
        .withArgs(vaultId, bob.address, mockTokenAddress, donationAmount);

      // Check vault balance
      const vault = await sharingWishVault.vaultById(vaultId);
      expect(vault.totalAmount).to.equal(donationAmount);
    });

    it("Should revert with expired permit", async function () {
      const expiredDeadline = (await time.latest()) - 1000; // Set deadline in the past

      const { v, r, s } = await getPermitSignature(
        bob,
        mockToken,
        sharingWishVaultAddress,
        donationAmount,
        expiredDeadline,
      );

      await expect(
        sharingWishVault
          .connect(bob)
          .donateWithPermit(vaultId, donationAmount, expiredDeadline, v, r, s),
      ).to.be.revertedWithCustomError(mockToken, "ERC2612ExpiredSignature");
    });

    it("Should revert with invalid signature", async function () {
      // Use invalid signature values
      const v = 27;
      const r = ethers.ZeroHash;
      const s = ethers.ZeroHash;

      await expect(
        sharingWishVault
          .connect(bob)
          .donateWithPermit(vaultId, donationAmount, deadline, v, r, s),
      ).to.be.revertedWithCustomError(mockToken, "ECDSAInvalidSignature");
    });
  });

  describe("Claims and Withdrawals", function () {
    let vaultId;
    const donationAmount = ethers.parseEther("100");

    beforeEach(async function () {
      const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const receipt = await tx.wait();
      vaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

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
      const message = "Auto Claim Test";
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const newVaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

      const amount = ethers.parseEther("100");

      await sharingWishVault.connect(bob).donate(newVaultId, amount);

      // Get initial balance
      const initialBalance = await mockToken.balanceOf(charlie.address);

      // Settle with autoClaim enabled
      await expect(
        sharingWishVault
          .connect(owner)
          .settle(newVaultId, charlie.address, amount, true),
      )
        .to.emit(sharingWishVault, "VaultSettled")
        .withArgs(newVaultId, charlie.address, mockTokenAddress, amount)
        .to.emit(sharingWishVault, "FundsClaimed")
        .withArgs(newVaultId, charlie.address, mockTokenAddress, amount);

      // Verify balance change
      const finalBalance = await mockToken.balanceOf(charlie.address);
      expect(finalBalance - initialBalance).to.equal(amount);

      // Verify vault state
      const vault = await sharingWishVault.vaultById(newVaultId);
      expect(vault.totalAmount).to.equal(0);
      expect(vault.totalClaimedAmount).to.equal(amount);
      expect(
        await sharingWishVault.getClaimedAmount(newVaultId, charlie.address),
      ).to.equal(amount);
    });

    it("Should not auto-claim when settling with autoClaim disabled", async function () {
      // Create new vault and donate
      const message = "No Auto Claim Test";
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const newVaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );
      await sharingWishVault.connect(bob).donate(newVaultId, donationAmount);

      // Get initial balance
      const initialBalance = await mockToken.balanceOf(charlie.address);

      // Settle with autoClaim disabled
      await sharingWishVault
        .connect(owner)
        .settle(newVaultId, charlie.address, donationAmount, false);

      // Verify balance hasn't changed
      const afterSettleBalance = await mockToken.balanceOf(charlie.address);
      expect(afterSettleBalance).to.equal(initialBalance);

      // Verify vault state
      let vault = await sharingWishVault.vaultById(newVaultId);
      expect(vault.totalAmount).to.equal(donationAmount);
      expect(vault.totalClaimedAmount).to.equal(0);
      expect(
        await sharingWishVault.getMaxClaimableAmount(
          newVaultId,
          charlie.address,
        ),
      ).to.equal(donationAmount);

      // Now claim manually
      await sharingWishVault.connect(charlie).claim(newVaultId);

      // Verify final state
      vault = await sharingWishVault.vaultById(newVaultId);
      expect(vault.totalAmount).to.equal(0);
      expect(vault.totalClaimedAmount).to.equal(donationAmount);
    });

    it("Should correctly track total amount after multiple donations", async function () {
      // Create a new vault for this test
      const message = "Test Message 2";
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const newVaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("50");

      await sharingWishVault.connect(bob).donate(newVaultId, amount1);
      await sharingWishVault.connect(bob).donate(newVaultId, amount2);

      const vault = await sharingWishVault.vaultById(newVaultId);
      expect(vault.totalAmount).to.equal(amount1 + amount2);
    });

    it("Should correctly track claimed amounts after multiple settlements", async function () {
      // Create a new vault for this test
      const message = "Test Message 2";
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const newVaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

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
      let vault = await sharingWishVault.vaultById(newVaultId);
      expect(vault.totalAmount).to.equal(totalAmount - amount1);
      expect(vault.totalClaimedAmount).to.equal(amount1);

      // Check balance after first claim
      let currentBalance = await mockToken.balanceOf(charlie.address);
      expect(currentBalance - initialBalance).to.equal(amount1);

      // Second settlement with remaining amount
      await sharingWishVault
        .connect(owner)
        .settle(newVaultId, charlie.address, amount2, false); // Only settle the remaining amount
      await sharingWishVault.connect(charlie).claim(newVaultId);

      // Check final state
      vault = await sharingWishVault.vaultById(newVaultId);
      expect(vault.totalAmount).to.equal(0);
      expect(vault.totalClaimedAmount).to.equal(totalAmount);

      // Check final balance
      currentBalance = await mockToken.balanceOf(charlie.address);
      expect(currentBalance - initialBalance).to.equal(totalAmount);
    });

    it("Should correctly handle settlement and claims", async function () {
      // Create a new vault for this test
      const message = "Test Message 5";
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const newVaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );

      const amount = ethers.parseEther("100");

      // First donate enough funds
      await sharingWishVault.connect(bob).donate(newVaultId, amount);

      // Settle and claim full amount
      await expect(
        sharingWishVault
          .connect(owner)
          .settle(newVaultId, charlie.address, amount, true),
      )
        .to.emit(sharingWishVault, "VaultSettled")
        .withArgs(newVaultId, charlie.address, mockTokenAddress, amount)
        .to.emit(sharingWishVault, "FundsClaimed")
        .withArgs(newVaultId, charlie.address, mockTokenAddress, amount);

      // Verify vault state
      const vault = await sharingWishVault.vaultById(newVaultId);
      expect(vault.totalAmount).to.equal(0);
      expect(vault.totalClaimedAmount).to.equal(amount);
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
        sharingWishVault.connect(bob).withdraw(vaultId, donationAmount),
      )
        .to.emit(sharingWishVault, "FundsWithdrawn")
        .withArgs(vaultId, bob.address, mockTokenAddress, donationAmount);
    });

    it("Should revert withdrawal before lock period", async function () {
      await expect(
        sharingWishVault.connect(bob).withdraw(vaultId, donationAmount),
      ).to.be.revertedWith("Vault is not expired");
    });
  });

  describe("Vault Query", function () {
    let vaultId;
    const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
    const amount = ethers.parseEther("100");

    beforeEach(async function () {
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, amount);
      const receipt = await tx.wait();
      vaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );
    });

    it("Should return correct vault information", async function () {
      const vault = await sharingWishVault.vaultById(vaultId);
      expect(vault.message).to.equal(message);
      expect(vault.creator).to.equal(alice.address);
      expect(vault.token).to.equal(mockTokenAddress);
      expect(vault.totalAmount).to.equal(amount);
      expect(vault.totalClaimedAmount).to.equal(0);
      expect(vault.lockTime).to.be.gt(0); // Verify lock time is set properly
    });

    it("Should return updated vault information after donation", async function () {
      const donationAmount = ethers.parseEther("50");
      await mockToken
        .connect(bob)
        .approve(sharingWishVaultAddress, donationAmount);
      await sharingWishVault.connect(bob).donate(vaultId, donationAmount);

      const vault = await sharingWishVault.vaultById(vaultId);
      expect(vault.totalAmount).to.equal(amount + donationAmount);
    });

    it("Should return updated vault information after claim", async function () {
      const claimAmount = ethers.parseEther("30");
      // 不提前增加时间，保持在锁定期内
      await sharingWishVault
        .connect(owner)
        .settle(vaultId, charlie.address, claimAmount, true);

      const vault = await sharingWishVault.vaultById(vaultId);
      expect(vault.totalAmount).to.equal(amount - claimAmount);
      expect(vault.totalClaimedAmount).to.equal(claimAmount);
    });
  });

  describe("Emergency Functions", function () {
    let vaultId;
    const donationAmount = ethers.parseEther("100");

    beforeEach(async function () {
      const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const receipt = await tx.wait();
      vaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );
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
          .createVault("Test Message", mockTokenAddress, MIN_LOCK_TIME, 0),
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

  describe("Donor Features", function () {
    describe("Donor Tracking", function () {
      let vaultId;

      beforeEach(async function () {
        const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
        const tx = await sharingWishVault
          .connect(alice)
          .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
        const receipt = await tx.wait();
        vaultId = ethers.keccak256(
          ethers.solidityPacked(
            ["address", "string"],
            [alice.address, message],
          ),
        );
      });

      it("Should track donor amounts correctly", async function () {
        const aliceDonation = ethers.parseEther("100");
        const bobDonation = ethers.parseEther("200");
        const charlieDonation = ethers.parseEther("300");

        // Alice donates
        await sharingWishVault.connect(alice).donate(vaultId, aliceDonation);

        // Check donor info
        const [aliceDonated1, aliceWithdrawable1] =
          await sharingWishVault.getDonorInfo(vaultId, alice.address);
        expect(aliceDonated1).to.equal(aliceDonation);
        expect(aliceWithdrawable1).to.equal(0); // Not withdrawable yet (lock period)

        // Bob donates
        await sharingWishVault.connect(bob).donate(vaultId, bobDonation);

        // Charlie donates
        await sharingWishVault
          .connect(charlie)
          .donate(vaultId, charlieDonation);

        // Check all donor info
        const [aliceDonated2] = await sharingWishVault.getDonorInfo(
          vaultId,
          alice.address,
        );
        const [bobDonated] = await sharingWishVault.getDonorInfo(
          vaultId,
          bob.address,
        );
        const [charlieDonated] = await sharingWishVault.getDonorInfo(
          vaultId,
          charlie.address,
        );

        expect(aliceDonated2).to.equal(aliceDonation);
        expect(bobDonated).to.equal(bobDonation);
        expect(charlieDonated).to.equal(charlieDonation);

        // Fast forward past lock period
        await time.increase(MIN_LOCK_TIME + 1);

        // Now check withdrawable amounts
        const [, aliceWithdrawable2] = await sharingWishVault.getDonorInfo(
          vaultId,
          alice.address,
        );
        const [, bobWithdrawable] = await sharingWishVault.getDonorInfo(
          vaultId,
          bob.address,
        );
        const [, charlieWithdrawable] = await sharingWishVault.getDonorInfo(
          vaultId,
          charlie.address,
        );

        // Total donations = 600 ETH, so each donor should be able to withdraw their full donation
        expect(aliceWithdrawable2).to.equal(aliceDonation);
        expect(bobWithdrawable).to.equal(bobDonation);
        expect(charlieWithdrawable).to.equal(charlieDonation);
      });
    });

    describe("Proportional Withdrawals", function () {
      let vaultId;
      const aliceDonation = ethers.parseEther("100");
      const bobDonation = ethers.parseEther("200");
      const charlieDonation = ethers.parseEther("300");
      const totalDonation = aliceDonation + bobDonation + charlieDonation;

      beforeEach(async function () {
        const message = `WishVault_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
        const tx = await sharingWishVault
          .connect(alice)
          .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
        const receipt = await tx.wait();
        vaultId = ethers.keccak256(
          ethers.solidityPacked(
            ["address", "string"],
            [alice.address, message],
          ),
        );

        // All three users donate
        await sharingWishVault.connect(alice).donate(vaultId, aliceDonation);
        await sharingWishVault.connect(bob).donate(vaultId, bobDonation);
        await sharingWishVault
          .connect(charlie)
          .donate(vaultId, charlieDonation);

        // Settle 300 ETH to david (half of the total)
        const settleAmount = totalDonation / 2n;
        await sharingWishVault
          .connect(owner)
          .settle(vaultId, david.address, settleAmount, true);

        // Fast forward past lock period
        await time.increase(MIN_LOCK_TIME + 1);
      });

      it("Should allow partial withdrawal up to proportional share", async function () {
        // Alice's proportional share should be 50 ETH
        const [, aliceWithdrawable] = await sharingWishVault.getDonorInfo(
          vaultId,
          alice.address,
        );
        expect(aliceWithdrawable).to.equal(ethers.parseEther("50"));

        // Alice withdraws part of her share
        const withdrawal = ethers.parseEther("20");
        await sharingWishVault.connect(alice).withdraw(vaultId, withdrawal);

        // Check Alice's updated donor info after withdrawal
        const [aliceDonatedAfter, aliceWithdrawableAfter] =
          await sharingWishVault.getDonorInfo(vaultId, alice.address);
        expect(aliceDonatedAfter).to.equal(aliceDonation - withdrawal);

        // Due to the proportional calculation, we expect the withdrawable amount to be reduced
        expect(aliceWithdrawableAfter).to.be.lessThan(aliceWithdrawable);
        expect(aliceWithdrawableAfter).to.be.greaterThan(0);

        // Alice tries to withdraw more than her remaining share
        await expect(
          sharingWishVault.connect(alice).withdraw(vaultId, aliceWithdrawable),
        ).to.be.revertedWithCustomError(
          sharingWishVault,
          "InsufficientBalance",
        );

        // Alice can withdraw her remaining share
        await expect(
          sharingWishVault
            .connect(alice)
            .withdraw(vaultId, aliceWithdrawableAfter),
        ).to.emit(sharingWishVault, "FundsWithdrawn");
      });
    });
  });

  describe("Lock Period Logic", function () {
    let vaultId;
    const donationAmount = ethers.parseEther("100");

    beforeEach(async function () {
      const message = `LockPeriodTest_${new Date().getTime()}`;
      const tx = await sharingWishVault
        .connect(alice)
        .createVault(message, mockTokenAddress, MIN_LOCK_TIME, 0);
      const receipt = await tx.wait();
      vaultId = ethers.keccak256(
        ethers.solidityPacked(["address", "string"], [alice.address, message]),
      );
    });

    it("Should allow donations during lock period", async function () {
      // Still in lock period, should accept donation
      await expect(
        sharingWishVault.connect(bob).donate(vaultId, donationAmount),
      )
        .to.emit(sharingWishVault, "FundsDonated")
        .withArgs(vaultId, bob.address, mockTokenAddress, donationAmount);
    });

    it("Should reject donations after lock period expires", async function () {
      // Fast forward to after lock period
      await time.increase(MIN_LOCK_TIME + 100);

      // Now donation should be rejected
      await expect(
        sharingWishVault.connect(bob).donate(vaultId, donationAmount),
      ).to.be.revertedWithCustomError(sharingWishVault, "VaultExpired");
    });

    it("Should allow settlement during lock period", async function () {
      // Donate some funds first
      await sharingWishVault.connect(bob).donate(vaultId, donationAmount);

      // Settlement during lock period should be accepted
      await expect(
        sharingWishVault
          .connect(owner)
          .settle(vaultId, charlie.address, donationAmount, false),
      ).to.emit(sharingWishVault, "VaultSettled");
    });

    it("Should reject settlement after lock period", async function () {
      // Donate some funds first
      await sharingWishVault.connect(bob).donate(vaultId, donationAmount);

      // Fast forward to after lock period
      await time.increase(MIN_LOCK_TIME + 100);

      // Settlement after lock period should be rejected
      await expect(
        sharingWishVault
          .connect(owner)
          .settle(vaultId, charlie.address, donationAmount, false),
      ).to.be.revertedWithCustomError(sharingWishVault, "VaultExpired");
    });

    it("Should allow claims during lock period", async function () {
      // Donate some funds first
      await sharingWishVault.connect(bob).donate(vaultId, donationAmount);

      // Set up a claimable amount
      await sharingWishVault
        .connect(owner)
        .settle(vaultId, charlie.address, donationAmount, false);

      // Claim should be allowed during lock period
      await expect(sharingWishVault.connect(charlie).claim(vaultId)).to.emit(
        sharingWishVault,
        "FundsClaimed",
      );
    });

    it("Should reject claims after lock period", async function () {
      // Donate some funds first
      await sharingWishVault.connect(bob).donate(vaultId, donationAmount);

      // Set up a claimable amount
      await sharingWishVault
        .connect(owner)
        .settle(vaultId, charlie.address, donationAmount, false);

      // Fast forward to after lock period
      await time.increase(MIN_LOCK_TIME + 100);

      // Claim should be rejected after lock period
      await expect(
        sharingWishVault.connect(charlie).claim(vaultId),
      ).to.be.revertedWithCustomError(sharingWishVault, "VaultExpired");
    });
  });
});

async function getPermitSignature(signer, token, spender, amount, deadline) {
  const nonce = await token.nonces(signer.address);
  const permitData = {
    owner: signer.address,
    spender: spender,
    value: amount,
    nonce: nonce,
    deadline: deadline,
  };

  const signature = await signer.signTypedData(
    // Domain
    {
      name: await token.name(),
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: token.address,
    },
    // Types
    {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    permitData,
  );

  const { v, r, s } = ethers.Signature.from(signature);
  return { v, r, s };
}
