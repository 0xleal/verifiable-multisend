import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cross-Chain Verification", () => {
  // Constants
  const CELO_SEPOLIA_DOMAIN = 11142220;
  const BASE_SEPOLIA_DOMAIN = 84532;

  async function deployCrossChainSetup() {
    const [
      deployer,
      hub,
      owner,
      user1,
      user2,
      user3,
      relayer,
      unauthorized,
    ] = await ethers.getSigners();

    // Deploy mock mailboxes for both chains
    const MockMailbox = await ethers.getContractFactory("MockMailbox");
    const celoMailbox = await MockMailbox.deploy(CELO_SEPOLIA_DOMAIN);
    await celoMailbox.waitForDeployment();

    const baseMailbox = await MockMailbox.deploy(BASE_SEPOLIA_DOMAIN);
    await baseMailbox.waitForDeployment();

    // Deploy Celo verification registry WITH mailbox
    const CeloRegistry = await ethers.getContractFactory(
      "TestableVerificationRegistry"
    );
    const scopeSeed = "cross-chain-test";
    const celoRegistry = await CeloRegistry.connect(owner).deploy(
      hub.address,
      scopeSeed,
      await celoMailbox.getAddress()
    );
    await celoRegistry.waitForDeployment();

    // Set config on Celo registry
    const cfgId = ethers.keccak256(ethers.toUtf8Bytes("cross-chain-config"));
    await celoRegistry.connect(owner).setConfigId(cfgId);

    // Get scope from Celo registry
    const scope = await celoRegistry.getScope();

    // Deploy Base cross-chain registry
    const BaseRegistry = await ethers.getContractFactory(
      "CrossChainVerificationRegistry"
    );
    const baseRegistry = await BaseRegistry.connect(owner).deploy(
      await baseMailbox.getAddress(),
      CELO_SEPOLIA_DOMAIN,
      scope
    );
    await baseRegistry.waitForDeployment();

    // Deploy business contracts on both chains
    const MultiSendFactory = await ethers.getContractFactory(
      "TestableVerifiedMultiSend"
    );
    const celoMultiSend = await MultiSendFactory.deploy(
      await celoRegistry.getAddress()
    );
    await celoMultiSend.waitForDeployment();

    const baseMultiSend = await MultiSendFactory.deploy(
      await baseRegistry.getAddress()
    );
    await baseMultiSend.waitForDeployment();

    // Deploy ERC20 for testing
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const erc20 = await TestERC20.deploy("Test", "TST");
    await erc20.waitForDeployment();

    return {
      deployer,
      hub,
      owner,
      user1,
      user2,
      user3,
      relayer,
      unauthorized,
      celoMailbox,
      baseMailbox,
      celoRegistry,
      baseRegistry,
      celoMultiSend,
      baseMultiSend,
      erc20,
      scope,
    };
  }

  function buildUserData(userIdentifier: bigint) {
    const destinationChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    const userIdentifier32 = ethers.zeroPadValue(
      ethers.toBeHex(userIdentifier),
      32
    );
    const data = "0x";
    return ethers.concat([destinationChainId, userIdentifier32, data]);
  }

  async function verifyUserOnCelo(
    celoRegistry: any,
    hub: any,
    user: any
  ) {
    const userIdentifier = BigInt(ethers.getBigInt(user.address));
    const userData = buildUserData(userIdentifier);
    await celoRegistry.connect(hub).trigger(userData);
  }

  describe("CeloVerificationRegistry - Relay Functionality", () => {
    it("should successfully relay verification to Base", async () => {
      const { hub, user1, celoMailbox, celoRegistry, baseRegistry } =
        await deployCrossChainSetup();

      // 1. Verify user on Celo
      await verifyUserOnCelo(celoRegistry, hub, user1);
      expect(await celoRegistry.isVerified(user1.address)).to.be.true;

      // 2. Relay to Base
      const baseRegistryBytes32 = ethers.zeroPadValue(
        await baseRegistry.getAddress(),
        32
      );
      const tx = await celoRegistry.relayVerificationTo(
        BASE_SEPOLIA_DOMAIN,
        baseRegistryBytes32,
        user1.address,
        { value: ethers.parseEther("0.01") }
      );

      // 3. Verify event emitted
      const receipt = await tx.wait();
      const expiresAt = await celoRegistry.verificationExpiresAt(user1.address);

      await expect(tx)
        .to.emit(celoRegistry, "VerificationRelayed")
        .withArgs(
          user1.address,
          BASE_SEPOLIA_DOMAIN,
          baseRegistryBytes32,
          expiresAt,
          (messageId: any) => messageId !== ethers.ZeroHash
        );

      // 4. Verify message was dispatched (message count increased)
      expect(await celoMailbox.count()).to.equal(1);
    });

    it("should revert relay if user not verified", async () => {
      const { user1, celoRegistry, baseRegistry } = await deployCrossChainSetup();

      const baseRegistryBytes32 = ethers.zeroPadValue(
        await baseRegistry.getAddress(),
        32
      );

      await expect(
        celoRegistry.relayVerificationTo(
          BASE_SEPOLIA_DOMAIN,
          baseRegistryBytes32,
          user1.address
        )
      ).to.be.revertedWithCustomError(celoRegistry, "AccountNotVerified");
    });

    it("should revert relay if mailbox not configured", async () => {
      const { hub, owner, user1 } = await deployCrossChainSetup();

      // Deploy registry without mailbox
      const CeloRegistry = await ethers.getContractFactory(
        "TestableVerificationRegistry"
      );
      const registryNoMailbox = await CeloRegistry.connect(owner).deploy(
        hub.address,
        "test",
        ethers.ZeroAddress // No mailbox
      );

      const cfgId = ethers.keccak256(ethers.toUtf8Bytes("test-config"));
      await registryNoMailbox.connect(owner).setConfigId(cfgId);

      // Verify user
      await verifyUserOnCelo(registryNoMailbox, hub, user1);

      // Try to relay - should fail
      await expect(
        registryNoMailbox.relayVerificationTo(
          BASE_SEPOLIA_DOMAIN,
          ethers.zeroPadValue("0x1234", 32),
          user1.address
        )
      ).to.be.revertedWithCustomError(registryNoMailbox, "MailboxNotConfigured");
    });

    it("should allow anyone to relay anyone's verification", async () => {
      const { hub, user1, relayer, celoRegistry, baseRegistry } =
        await deployCrossChainSetup();

      // User1 verifies
      await verifyUserOnCelo(celoRegistry, hub, user1);

      // Relayer (different account) relays user1's verification
      const baseRegistryBytes32 = ethers.zeroPadValue(
        await baseRegistry.getAddress(),
        32
      );
      await expect(
        celoRegistry
          .connect(relayer)
          .relayVerificationTo(
            BASE_SEPOLIA_DOMAIN,
            baseRegistryBytes32,
            user1.address,
            { value: ethers.parseEther("0.01") }
          )
      ).to.not.be.reverted;
    });

    it("should forward msg.value to Hyperlane mailbox", async () => {
      const { hub, user1, celoMailbox, celoRegistry, baseRegistry } =
        await deployCrossChainSetup();

      await verifyUserOnCelo(celoRegistry, hub, user1);

      const balanceBefore = await ethers.provider.getBalance(
        await celoMailbox.getAddress()
      );

      const baseRegistryBytes32 = ethers.zeroPadValue(
        await baseRegistry.getAddress(),
        32
      );
      await celoRegistry.relayVerificationTo(
        BASE_SEPOLIA_DOMAIN,
        baseRegistryBytes32,
        user1.address,
        { value: ethers.parseEther("0.05") }
      );

      const balanceAfter = await ethers.provider.getBalance(
        await celoMailbox.getAddress()
      );

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.05"));
    });
  });

  describe("CrossChainVerificationRegistry - Receiving", () => {
    it("should receive and store verification from Celo", async () => {
      const { hub, user1, celoMailbox, celoRegistry, baseMailbox, baseRegistry } =
        await deployCrossChainSetup();

      // 1. Verify on Celo
      await verifyUserOnCelo(celoRegistry, hub, user1);
      const expiresAt = await celoRegistry.verificationExpiresAt(user1.address);

      // 2. Simulate Hyperlane message delivery
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [user1.address, expiresAt]
      );

      const celoRegistryBytes32 = ethers.zeroPadValue(
        await celoRegistry.getAddress(),
        32
      );

      const tx = await baseMailbox.deliverMessage(
        await baseRegistry.getAddress(),
        CELO_SEPOLIA_DOMAIN,
        celoRegistryBytes32,
        message
      );

      // 3. Verify state updated on Base
      expect(await baseRegistry.isVerified(user1.address)).to.be.true;
      expect(await baseRegistry.verificationExpiresAt(user1.address)).to.equal(
        expiresAt
      );

      // 4. Verify events emitted
      await expect(tx)
        .to.emit(baseRegistry, "VerificationUpdated")
        .withArgs(user1.address, expiresAt);

      await expect(tx)
        .to.emit(baseRegistry, "VerificationReceived")
        .withArgs(user1.address, expiresAt, CELO_SEPOLIA_DOMAIN, celoRegistryBytes32);
    });

    it("should reject message not from mailbox", async () => {
      const { user1, unauthorized, baseRegistry } = await deployCrossChainSetup();

      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [user1.address, Math.floor(Date.now() / 1000) + 86400]
      );

      await expect(
        baseRegistry
          .connect(unauthorized)
          .handle(
            CELO_SEPOLIA_DOMAIN,
            ethers.zeroPadValue(unauthorized.address, 32),
            message
          )
      ).to.be.revertedWithCustomError(baseRegistry, "OnlyMailbox");
    });

    it("should reject message from wrong origin domain", async () => {
      const { user1, baseMailbox, baseRegistry } = await deployCrossChainSetup();

      const WRONG_DOMAIN = 99999;
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [user1.address, Math.floor(Date.now() / 1000) + 86400]
      );

      await expect(
        baseMailbox.deliverMessage(
          await baseRegistry.getAddress(),
          WRONG_DOMAIN,
          ethers.zeroPadValue("0x1234", 32),
          message
        )
      ).to.be.revertedWithCustomError(baseRegistry, "InvalidOrigin");
    });

    it("should reject untrusted sender when enforcement enabled", async () => {
      const {
        owner,
        user1,
        unauthorized,
        baseMailbox,
        celoRegistry,
        baseRegistry,
      } = await deployCrossChainSetup();

      // Enable trusted sender enforcement
      await baseRegistry.connect(owner).setTrustedSenderEnforcement(true);

      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [user1.address, Math.floor(Date.now() / 1000) + 86400]
      );

      const unauthorizedBytes32 = ethers.zeroPadValue(unauthorized.address, 32);

      await expect(
        baseMailbox.deliverMessage(
          await baseRegistry.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          unauthorizedBytes32,
          message
        )
      ).to.be.revertedWithCustomError(baseRegistry, "UntrustedSender");

      // Add trusted sender and try again
      await baseRegistry.connect(owner).addTrustedSender(await celoRegistry.getAddress());

      const celoRegistryBytes32 = ethers.zeroPadValue(
        await celoRegistry.getAddress(),
        32
      );

      await expect(
        baseMailbox.deliverMessage(
          await baseRegistry.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          celoRegistryBytes32,
          message
        )
      ).to.not.be.reverted;
    });

    it("should handle multiple verifications for different users", async () => {
      const { hub, user1, user2, user3, celoMailbox, celoRegistry, baseMailbox, baseRegistry } =
        await deployCrossChainSetup();

      // Verify all users on Celo
      await verifyUserOnCelo(celoRegistry, hub, user1);
      await verifyUserOnCelo(celoRegistry, hub, user2);
      await verifyUserOnCelo(celoRegistry, hub, user3);

      const celoRegistryBytes32 = ethers.zeroPadValue(
        await celoRegistry.getAddress(),
        32
      );

      // Relay all to Base
      for (const user of [user1, user2, user3]) {
        const expiresAt = await celoRegistry.verificationExpiresAt(user.address);
        const message = ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256"],
          [user.address, expiresAt]
        );

        await baseMailbox.deliverMessage(
          await baseRegistry.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          celoRegistryBytes32,
          message
        );
      }

      // Verify all are verified on Base
      expect(await baseRegistry.isVerified(user1.address)).to.be.true;
      expect(await baseRegistry.isVerified(user2.address)).to.be.true;
      expect(await baseRegistry.isVerified(user3.address)).to.be.true;
    });
  });

  describe("Trusted Sender Management", () => {
    it("should add and remove trusted senders", async () => {
      const { owner, celoRegistry, baseRegistry } = await deployCrossChainSetup();

      const celoRegistryBytes32 = ethers.zeroPadValue(
        await celoRegistry.getAddress(),
        32
      );

      // Initially not trusted
      expect(await baseRegistry.isTrustedSenderBytes32(celoRegistryBytes32)).to.be
        .false;

      // Add as trusted
      await expect(
        baseRegistry.connect(owner).addTrustedSender(await celoRegistry.getAddress())
      )
        .to.emit(baseRegistry, "TrustedSenderAdded")
        .withArgs(celoRegistryBytes32);

      expect(await baseRegistry.isTrustedSenderBytes32(celoRegistryBytes32)).to.be
        .true;

      // Remove
      await expect(
        baseRegistry.connect(owner).removeTrustedSender(await celoRegistry.getAddress())
      )
        .to.emit(baseRegistry, "TrustedSenderRemoved")
        .withArgs(celoRegistryBytes32);

      expect(await baseRegistry.isTrustedSenderBytes32(celoRegistryBytes32)).to.be
        .false;
    });

    it("should toggle enforcement", async () => {
      const { owner, baseRegistry } = await deployCrossChainSetup();

      expect(await baseRegistry.enforceTrustedSenders()).to.be.false;

      await expect(baseRegistry.connect(owner).setTrustedSenderEnforcement(true))
        .to.emit(baseRegistry, "TrustedSenderEnforcementToggled")
        .withArgs(true);

      expect(await baseRegistry.enforceTrustedSenders()).to.be.true;

      await baseRegistry.connect(owner).setTrustedSenderEnforcement(false);
      expect(await baseRegistry.enforceTrustedSenders()).to.be.false;
    });
  });

  describe("Full Cross-Chain Integration", () => {
    it("should complete full flow: Verify on Celo → Relay → Use MultiSend on Base", async () => {
      const {
        hub,
        user1,
        user2,
        user3,
        celoMailbox,
        celoRegistry,
        baseMailbox,
        baseRegistry,
        baseMultiSend,
        erc20,
      } = await deployCrossChainSetup();

      // 1. User1 verifies on Celo
      await verifyUserOnCelo(celoRegistry, hub, user1);
      expect(await celoRegistry.isVerified(user1.address)).to.be.true;

      // 2. User1 NOT verified on Base yet
      expect(await baseRegistry.isVerified(user1.address)).to.be.false;
      expect(await baseMultiSend.isSenderVerified(user1.address)).to.be.false;

      // 3. Relay verification to Base
      const expiresAt = await celoRegistry.verificationExpiresAt(user1.address);
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [user1.address, expiresAt]
      );

      const celoRegistryBytes32 = ethers.zeroPadValue(
        await celoRegistry.getAddress(),
        32
      );

      await baseMailbox.deliverMessage(
        await baseRegistry.getAddress(),
        CELO_SEPOLIA_DOMAIN,
        celoRegistryBytes32,
        message
      );

      // 4. Now user1 is verified on Base
      expect(await baseRegistry.isVerified(user1.address)).to.be.true;
      expect(await baseMultiSend.isSenderVerified(user1.address)).to.be.true;

      // 5. User1 can use MultiSend on Base
      const addresses = [user2.address, user3.address];
      const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];
      const totalAmount = ethers.parseEther("30");

      await erc20.mint(user1.address, totalAmount);
      await erc20.connect(user1).approve(await baseMultiSend.getAddress(), totalAmount);

      await expect(
        baseMultiSend
          .connect(user1)
          .airdropERC20(await erc20.getAddress(), addresses, amounts, totalAmount)
      ).to.not.be.reverted;

      // Verify recipients received tokens
      expect(await erc20.balanceOf(user2.address)).to.equal(amounts[0]);
      expect(await erc20.balanceOf(user3.address)).to.equal(amounts[1]);
    });

    it("should respect expiry times across chains", async () => {
      const {
        hub,
        user1,
        celoMailbox,
        celoRegistry,
        baseMailbox,
        baseRegistry,
      } = await deployCrossChainSetup();

      // Verify on Celo
      await verifyUserOnCelo(celoRegistry, hub, user1);
      const expiresAt = await celoRegistry.verificationExpiresAt(user1.address);

      // Relay to Base with SAME expiry
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [user1.address, expiresAt]
      );

      const celoRegistryBytes32 = ethers.zeroPadValue(
        await celoRegistry.getAddress(),
        32
      );

      await baseMailbox.deliverMessage(
        await baseRegistry.getAddress(),
        CELO_SEPOLIA_DOMAIN,
        celoRegistryBytes32,
        message
      );

      // Both chains should have same expiry
      expect(await baseRegistry.verificationExpiresAt(user1.address)).to.equal(
        expiresAt
      );
    });

    it("should handle re-verification and update", async () => {
      const {
        hub,
        user1,
        celoMailbox,
        celoRegistry,
        baseMailbox,
        baseRegistry,
      } = await deployCrossChainSetup();

      // Initial verification
      await verifyUserOnCelo(celoRegistry, hub, user1);
      const firstExpiry = await celoRegistry.verificationExpiresAt(user1.address);

      // Relay to Base
      let message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [user1.address, firstExpiry]
      );

      const celoRegistryBytes32 = ethers.zeroPadValue(
        await celoRegistry.getAddress(),
        32
      );

      await baseMailbox.deliverMessage(
        await baseRegistry.getAddress(),
        CELO_SEPOLIA_DOMAIN,
        celoRegistryBytes32,
        message
      );

      expect(await baseRegistry.verificationExpiresAt(user1.address)).to.equal(
        firstExpiry
      );

      // Re-verify on Celo (should update expiry)
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour later
      await ethers.provider.send("evm_mine", []);

      await verifyUserOnCelo(celoRegistry, hub, user1);
      const secondExpiry = await celoRegistry.verificationExpiresAt(user1.address);
      expect(secondExpiry).to.be.gt(firstExpiry);

      // Relay updated verification to Base
      message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [user1.address, secondExpiry]
      );

      await baseMailbox.deliverMessage(
        await baseRegistry.getAddress(),
        CELO_SEPOLIA_DOMAIN,
        celoRegistryBytes32,
        message
      );

      // Base should have updated expiry
      expect(await baseRegistry.verificationExpiresAt(user1.address)).to.equal(
        secondExpiry
      );
    });
  });

  describe("Interface Compatibility", () => {
    it("should implement IVerificationRegistry consistently", async () => {
      const { celoRegistry, baseRegistry } = await deployCrossChainSetup();

      // Both should implement the same interface methods
      expect(typeof celoRegistry.isVerified).to.equal("function");
      expect(typeof celoRegistry.verificationExpiresAt).to.equal("function");
      expect(typeof celoRegistry.getScope).to.equal("function");

      expect(typeof baseRegistry.isVerified).to.equal("function");
      expect(typeof baseRegistry.verificationExpiresAt).to.equal("function");
      expect(typeof baseRegistry.getScope).to.equal("function");

      // Scopes should match
      expect(await baseRegistry.getScope()).to.equal(
        await celoRegistry.getScope()
      );
    });
  });

  describe("End-to-End: Real-World Usage on Base", () => {
    describe("MultiSend Distribution on Base", () => {
      it("should complete full flow: Verify on Celo → Relay → Distribute ERC20 on Base", async () => {
        const {
          hub,
          user1,
          user2,
          user3,
          relayer,
          celoRegistry,
          baseMailbox,
          baseRegistry,
          baseMultiSend,
          erc20,
        } = await deployCrossChainSetup();

        // ===== STEP 1: User verifies on Celo =====
        await verifyUserOnCelo(celoRegistry, hub, user1);
        expect(await celoRegistry.isVerified(user1.address)).to.be.true;

        // User1 NOT verified on Base yet
        expect(await baseRegistry.isVerified(user1.address)).to.be.false;
        expect(await baseMultiSend.isSenderVerified(user1.address)).to.be.false;

        // ===== STEP 2: Someone (relayer) relays verification to Base =====
        const expiresAt = await celoRegistry.verificationExpiresAt(user1.address);
        const message = ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256"],
          [user1.address, expiresAt]
        );

        const celoRegistryBytes32 = ethers.zeroPadValue(
          await celoRegistry.getAddress(),
          32
        );

        // Simulate Hyperlane delivering the message
        await baseMailbox.deliverMessage(
          await baseRegistry.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          celoRegistryBytes32,
          message
        );

        // ===== STEP 3: User1 now verified on Base =====
        expect(await baseRegistry.isVerified(user1.address)).to.be.true;
        expect(await baseMultiSend.isSenderVerified(user1.address)).to.be.true;

        // ===== STEP 4: User1 distributes tokens to multiple recipients on Base =====
        const recipients = [user2.address, user3.address, relayer.address];
        const amounts = [
          ethers.parseEther("100"),
          ethers.parseEther("250"),
          ethers.parseEther("50"),
        ];
        const totalAmount = ethers.parseEther("400");

        // Mint tokens to user1 and approve MultiSend
        await erc20.mint(user1.address, totalAmount);
        await erc20
          .connect(user1)
          .approve(await baseMultiSend.getAddress(), totalAmount);

        // Check initial balances
        const user2BalanceBefore = await erc20.balanceOf(user2.address);
        const user3BalanceBefore = await erc20.balanceOf(user3.address);
        const relayerBalanceBefore = await erc20.balanceOf(relayer.address);

        // Execute distribution on Base
        const tx = await baseMultiSend
          .connect(user1)
          .airdropERC20(
            await erc20.getAddress(),
            recipients,
            amounts,
            totalAmount
          );

        // ===== STEP 5: Verify all recipients received tokens =====
        expect(await erc20.balanceOf(user2.address)).to.equal(
          user2BalanceBefore + amounts[0]
        );
        expect(await erc20.balanceOf(user3.address)).to.equal(
          user3BalanceBefore + amounts[1]
        );
        expect(await erc20.balanceOf(relayer.address)).to.equal(
          relayerBalanceBefore + amounts[2]
        );

        // User1 spent all tokens
        expect(await erc20.balanceOf(user1.address)).to.equal(0n);

        // Verify transaction succeeded
        const receipt = await tx.wait();
        expect(receipt?.status).to.equal(1);
      });

      it("should complete full flow: Verify on Celo → Relay → Distribute ETH on Base", async () => {
        const {
          hub,
          user1,
          user2,
          user3,
          celoRegistry,
          baseMailbox,
          baseRegistry,
          baseMultiSend,
        } = await deployCrossChainSetup();

        // ===== STEP 1: User verifies on Celo =====
        await verifyUserOnCelo(celoRegistry, hub, user1);

        // ===== STEP 2: Relay to Base =====
        const expiresAt = await celoRegistry.verificationExpiresAt(user1.address);
        const message = ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256"],
          [user1.address, expiresAt]
        );

        const celoRegistryBytes32 = ethers.zeroPadValue(
          await celoRegistry.getAddress(),
          32
        );

        await baseMailbox.deliverMessage(
          await baseRegistry.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          celoRegistryBytes32,
          message
        );

        // ===== STEP 3: Distribute ETH on Base =====
        const recipients = [user2.address, user3.address];
        const amounts = [ethers.parseEther("1.5"), ethers.parseEther("2.5")];
        const totalAmount = ethers.parseEther("4");

        const user2BalanceBefore = await ethers.provider.getBalance(user2.address);
        const user3BalanceBefore = await ethers.provider.getBalance(user3.address);

        await baseMultiSend
          .connect(user1)
          .airdropETH(recipients, amounts, { value: totalAmount });

        // ===== STEP 4: Verify recipients received ETH =====
        const user2BalanceAfter = await ethers.provider.getBalance(user2.address);
        const user3BalanceAfter = await ethers.provider.getBalance(user3.address);

        expect(user2BalanceAfter - user2BalanceBefore).to.equal(amounts[0]);
        expect(user3BalanceAfter - user3BalanceBefore).to.equal(amounts[1]);
      });

      it("should reject distribution on Base if user not verified", async () => {
        const { user1, user2, baseMultiSend, erc20 } =
          await deployCrossChainSetup();

        // User1 has NOT verified or relayed to Base
        expect(await baseMultiSend.isSenderVerified(user1.address)).to.be.false;

        const recipients = [user2.address];
        const amounts = [ethers.parseEther("100")];
        const totalAmount = ethers.parseEther("100");

        await erc20.mint(user1.address, totalAmount);
        await erc20
          .connect(user1)
          .approve(await baseMultiSend.getAddress(), totalAmount);

        // Should revert - not verified on Base
        await expect(
          baseMultiSend
            .connect(user1)
            .airdropERC20(
              await erc20.getAddress(),
              recipients,
              amounts,
              totalAmount
            )
        ).to.be.revertedWithCustomError(baseMultiSend, "SenderNotVerified");
      });

      it("should reject distribution on Base if verification expired", async () => {
        const {
          hub,
          user1,
          user2,
          celoRegistry,
          baseMailbox,
          baseRegistry,
          baseMultiSend,
          erc20,
        } = await deployCrossChainSetup();

        // Verify on Celo
        await verifyUserOnCelo(celoRegistry, hub, user1);
        const expiresAt = await celoRegistry.verificationExpiresAt(user1.address);

        // Relay to Base
        const message = ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256"],
          [user1.address, expiresAt]
        );

        const celoRegistryBytes32 = ethers.zeroPadValue(
          await celoRegistry.getAddress(),
          32
        );

        await baseMailbox.deliverMessage(
          await baseRegistry.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          celoRegistryBytes32,
          message
        );

        // Fast forward past expiry (30 days + 1 second)
        await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
        await ethers.provider.send("evm_mine", []);

        // Now expired
        expect(await baseRegistry.isVerified(user1.address)).to.be.false;
        expect(await baseMultiSend.isSenderVerified(user1.address)).to.be.false;

        // Should revert
        const recipients = [user2.address];
        const amounts = [ethers.parseEther("100")];
        const totalAmount = ethers.parseEther("100");

        await erc20.mint(user1.address, totalAmount);
        await erc20
          .connect(user1)
          .approve(await baseMultiSend.getAddress(), totalAmount);

        await expect(
          baseMultiSend
            .connect(user1)
            .airdropERC20(
              await erc20.getAddress(),
              recipients,
              amounts,
              totalAmount
            )
        ).to.be.revertedWithCustomError(baseMultiSend, "SenderNotVerified");
      });
    });

    describe("Airdrop Creation and Claiming on Base", () => {
      it("should complete full flow: Creator verifies → Creates airdrop → Claimers verify → Claim on Base", async () => {
        const {
          hub,
          owner,
          user1,
          user2,
          user3,
          celoRegistry,
          baseMailbox,
          baseRegistry,
          erc20,
        } = await deployCrossChainSetup();

        // Deploy airdrop contract on Base
        const AirdropFactory = await ethers.getContractFactory(
          "TestableVerifiedAirdrop"
        );
        const baseAirdrop = await AirdropFactory.deploy(
          await baseRegistry.getAddress()
        );
        await baseAirdrop.waitForDeployment();

        // ===== STEP 1: Creator (user1) verifies on Celo =====
        await verifyUserOnCelo(celoRegistry, hub, user1);

        // ===== STEP 2: Claimers (user2, user3) verify on Celo =====
        await verifyUserOnCelo(celoRegistry, hub, user2);
        await verifyUserOnCelo(celoRegistry, hub, user3);

        // ===== STEP 3: Relay all verifications to Base =====
        const celoRegistryBytes32 = ethers.zeroPadValue(
          await celoRegistry.getAddress(),
          32
        );

        for (const user of [user1, user2, user3]) {
          const expiresAt = await celoRegistry.verificationExpiresAt(user.address);
          const message = ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint256"],
            [user.address, expiresAt]
          );

          await baseMailbox.deliverMessage(
            await baseRegistry.getAddress(),
            CELO_SEPOLIA_DOMAIN,
            celoRegistryBytes32,
            message
          );
        }

        // Verify all are verified on Base
        expect(await baseRegistry.isVerified(user1.address)).to.be.true;
        expect(await baseRegistry.isVerified(user2.address)).to.be.true;
        expect(await baseRegistry.isVerified(user3.address)).to.be.true;

        // ===== STEP 4: Creator creates merkle airdrop on Base =====
        const leaves = [
          { address: user2.address, amount: ethers.parseEther("500") },
          { address: user3.address, amount: ethers.parseEther("1000") },
        ];

        // Import merkle tree helper
        const { MerkleTree } = await import("merkletreejs");

        const elements = leaves.map((leaf, index) =>
          ethers.keccak256(
            ethers.solidityPacked(
              ["uint256", "address", "uint256"],
              [index, leaf.address, leaf.amount]
            )
          )
        );
        const merkleTree = new MerkleTree(elements, ethers.keccak256, {
          sortPairs: true,
        });
        const merkleRoot = merkleTree.getHexRoot();

        const airdropId = ethers.id("base-test-airdrop");
        const totalAmount = ethers.parseEther("1500");

        // Mint and approve
        await erc20.mint(user1.address, totalAmount);
        await erc20
          .connect(user1)
          .approve(await baseAirdrop.getAddress(), totalAmount);

        // Create airdrop on Base
        await baseAirdrop
          .connect(user1)
          .createAirdropERC20(
            airdropId,
            merkleRoot,
            await erc20.getAddress(),
            totalAmount
          );

        // ===== STEP 5: Claimers claim their tokens on Base =====
        // User2 claims
        const proof2 = merkleTree.getHexProof(elements[0]);
        await baseAirdrop.connect(user2).claim(airdropId, 0, leaves[0].amount, proof2);

        expect(await erc20.balanceOf(user2.address)).to.equal(leaves[0].amount);

        // User3 claims
        const proof3 = merkleTree.getHexProof(elements[1]);
        await baseAirdrop.connect(user3).claim(airdropId, 1, leaves[1].amount, proof3);

        expect(await erc20.balanceOf(user3.address)).to.equal(leaves[1].amount);

        // Airdrop fully claimed
        const airdropData = await baseAirdrop.airdrops(airdropId);
        expect(airdropData.claimedAmount).to.equal(totalAmount);
      });

      it("should reject claim on Base if claimer not verified", async () => {
        const {
          hub,
          user1,
          user2,
          unauthorized,
          celoRegistry,
          baseMailbox,
          baseRegistry,
          erc20,
        } = await deployCrossChainSetup();

        // Deploy airdrop on Base
        const AirdropFactory = await ethers.getContractFactory(
          "TestableVerifiedAirdrop"
        );
        const baseAirdrop = await AirdropFactory.deploy(
          await baseRegistry.getAddress()
        );
        await baseAirdrop.waitForDeployment();

        // Creator verifies and relays
        await verifyUserOnCelo(celoRegistry, hub, user1);
        const creatorMessage = ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256"],
          [user1.address, await celoRegistry.verificationExpiresAt(user1.address)]
        );

        const celoRegistryBytes32 = ethers.zeroPadValue(
          await celoRegistry.getAddress(),
          32
        );

        await baseMailbox.deliverMessage(
          await baseRegistry.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          celoRegistryBytes32,
          creatorMessage
        );

        // Create airdrop
        const { MerkleTree } = await import("merkletreejs");
        const leaves = [
          { address: user2.address, amount: ethers.parseEther("100") },
        ];

        const elements = leaves.map((leaf, index) =>
          ethers.keccak256(
            ethers.solidityPacked(
              ["uint256", "address", "uint256"],
              [index, leaf.address, leaf.amount]
            )
          )
        );
        const merkleTree = new MerkleTree(elements, ethers.keccak256, {
          sortPairs: true,
        });
        const merkleRoot = merkleTree.getHexRoot();

        const airdropId = ethers.id("test-airdrop");
        const totalAmount = ethers.parseEther("100");

        await erc20.mint(user1.address, totalAmount);
        await erc20
          .connect(user1)
          .approve(await baseAirdrop.getAddress(), totalAmount);

        await baseAirdrop
          .connect(user1)
          .createAirdropERC20(
            airdropId,
            merkleRoot,
            await erc20.getAddress(),
            totalAmount
          );

        // User2 tries to claim WITHOUT verifying/relaying
        expect(await baseRegistry.isVerified(user2.address)).to.be.false;

        const proof = merkleTree.getHexProof(elements[0]);

        await expect(
          baseAirdrop.connect(user2).claim(airdropId, 0, leaves[0].amount, proof)
        ).to.be.revertedWithCustomError(baseAirdrop, "NotVerified");
      });

      it("should work with ETH airdrop on Base", async () => {
        const {
          hub,
          user1,
          user2,
          celoRegistry,
          baseMailbox,
          baseRegistry,
        } = await deployCrossChainSetup();

        // Deploy airdrop on Base
        const AirdropFactory = await ethers.getContractFactory(
          "TestableVerifiedAirdrop"
        );
        const baseAirdrop = await AirdropFactory.deploy(
          await baseRegistry.getAddress()
        );
        await baseAirdrop.waitForDeployment();

        // Verify both users and relay
        await verifyUserOnCelo(celoRegistry, hub, user1);
        await verifyUserOnCelo(celoRegistry, hub, user2);

        const celoRegistryBytes32 = ethers.zeroPadValue(
          await celoRegistry.getAddress(),
          32
        );

        for (const user of [user1, user2]) {
          const expiresAt = await celoRegistry.verificationExpiresAt(user.address);
          const message = ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint256"],
            [user.address, expiresAt]
          );

          await baseMailbox.deliverMessage(
            await baseRegistry.getAddress(),
            CELO_SEPOLIA_DOMAIN,
            celoRegistryBytes32,
            message
          );
        }

        // Create ETH airdrop
        const { MerkleTree } = await import("merkletreejs");
        const leaves = [{ address: user2.address, amount: ethers.parseEther("5") }];

        const elements = leaves.map((leaf, index) =>
          ethers.keccak256(
            ethers.solidityPacked(
              ["uint256", "address", "uint256"],
              [index, leaf.address, leaf.amount]
            )
          )
        );
        const merkleTree = new MerkleTree(elements, ethers.keccak256, {
          sortPairs: true,
        });
        const merkleRoot = merkleTree.getHexRoot();

        const airdropId = ethers.id("eth-airdrop-base");
        const totalAmount = ethers.parseEther("5");

        await baseAirdrop
          .connect(user1)
          .createAirdropETH(airdropId, merkleRoot, { value: totalAmount });

        // Claim
        const user2BalanceBefore = await ethers.provider.getBalance(user2.address);
        const proof = merkleTree.getHexProof(elements[0]);

        const tx = await baseAirdrop
          .connect(user2)
          .claim(airdropId, 0, leaves[0].amount, proof);

        const receipt = await tx.wait();
        const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

        const user2BalanceAfter = await ethers.provider.getBalance(user2.address);

        // User2 received the airdrop amount minus gas
        expect(user2BalanceAfter - user2BalanceBefore + gasUsed).to.equal(
          leaves[0].amount
        );
      });
    });
  });
});
