import { expect } from "chai";
import { ethers } from "hardhat";

describe("SelfVerifiedMultiSend", () => {
  async function deploy() {
    const [deployer, hub, owner, sender, recipient1, recipient2, recipient3] =
      await ethers.getSigners();

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const erc20 = await TestERC20.deploy("Test", "TST");
    await erc20.waitForDeployment();

    const VerifiedMultiSend = await ethers.getContractFactory(
      "TestableVerifiedMultiSend"
    );
    const scopeSeed = ethers.keccak256(ethers.toUtf8Bytes("verified-multisend"));
    const multisend = await VerifiedMultiSend.connect(owner).deploy(
      hub.address,
      scopeSeed
    );
    await multisend.waitForDeployment();

    // Set config id
    const cfgId = ethers.keccak256(
      ethers.toUtf8Bytes("verified-multisend-config")
    );
    await multisend.connect(owner).setConfigId(cfgId);

    return {
      deployer,
      hub,
      owner,
      sender,
      recipient1,
      recipient2,
      recipient3,
      erc20,
      multisend,
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

  async function verifyUser(multisend: any, hub: any, user: any) {
    const userIdentifier = BigInt(ethers.getBigInt(user.address));
    const userData = buildUserData(userIdentifier);
    await multisend.connect(hub).trigger(userData);
  }

  describe("Verification", () => {
    it("should verify a sender", async () => {
      const { hub, sender, multisend } = await deploy();

      expect(await multisend.isSenderVerified(sender.address)).to.be.false;

      await verifyUser(multisend, hub, sender);

      expect(await multisend.isSenderVerified(sender.address)).to.be.true;

      const expiryTime = await multisend.verificationExpiresAt(sender.address);
      expect(expiryTime).to.be.gt(0);
    });

    it("should emit SenderVerified event", async () => {
      const { hub, sender, multisend } = await deploy();

      const userIdentifier = BigInt(ethers.getBigInt(sender.address));
      const userData = buildUserData(userIdentifier);

      const tx = await multisend.connect(hub).trigger(userData);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expectedExpiry = block!.timestamp + 30 * 24 * 60 * 60;

      await expect(tx)
        .to.emit(multisend, "SenderVerified")
        .withArgs(sender.address, expectedExpiry);
    });

    it("should reject unverified sender trying to airdrop", async () => {
      const { sender, recipient1, erc20, multisend } = await deploy();

      const addresses = [recipient1.address];
      const amounts = [ethers.parseEther("100")];
      const totalAmount = ethers.parseEther("100");

      await expect(
        multisend
          .connect(sender)
          .airdropERC20(await erc20.getAddress(), addresses, amounts, totalAmount)
      ).to.be.revertedWithCustomError(multisend, "SenderNotVerified");
    });
  });

  describe("ERC20 Airdrop", () => {
    it("should successfully airdrop ERC20 to multiple recipients", async () => {
      const { hub, sender, recipient1, recipient2, recipient3, erc20, multisend } =
        await deploy();

      // Verify sender
      await verifyUser(multisend, hub, sender);

      // Setup airdrop
      const addresses = [
        recipient1.address,
        recipient2.address,
        recipient3.address,
      ];
      const amounts = [
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("300"),
      ];
      const totalAmount = ethers.parseEther("600");

      // Mint and approve tokens
      await erc20.mint(sender.address, totalAmount);
      await erc20
        .connect(sender)
        .approve(await multisend.getAddress(), totalAmount);

      // Execute airdrop
      await multisend
        .connect(sender)
        .airdropERC20(await erc20.getAddress(), addresses, amounts, totalAmount);

      // Verify balances
      expect(await erc20.balanceOf(recipient1.address)).to.equal(amounts[0]);
      expect(await erc20.balanceOf(recipient2.address)).to.equal(amounts[1]);
      expect(await erc20.balanceOf(recipient3.address)).to.equal(amounts[2]);
    });

    it("should handle single recipient airdrop", async () => {
      const { hub, sender, recipient1, erc20, multisend } = await deploy();

      await verifyUser(multisend, hub, sender);

      const addresses = [recipient1.address];
      const amounts = [ethers.parseEther("1000")];
      const totalAmount = ethers.parseEther("1000");

      await erc20.mint(sender.address, totalAmount);
      await erc20
        .connect(sender)
        .approve(await multisend.getAddress(), totalAmount);

      await multisend
        .connect(sender)
        .airdropERC20(await erc20.getAddress(), addresses, amounts, totalAmount);

      expect(await erc20.balanceOf(recipient1.address)).to.equal(amounts[0]);
    });

    it("should revert if addresses and amounts length mismatch", async () => {
      const { hub, sender, recipient1, recipient2, erc20, multisend } =
        await deploy();

      await verifyUser(multisend, hub, sender);

      const addresses = [recipient1.address, recipient2.address];
      const amounts = [ethers.parseEther("100")]; // Only one amount
      const totalAmount = ethers.parseEther("100");

      await erc20.mint(sender.address, totalAmount);
      await erc20
        .connect(sender)
        .approve(await multisend.getAddress(), totalAmount);

      await expect(
        multisend
          .connect(sender)
          .airdropERC20(await erc20.getAddress(), addresses, amounts, totalAmount)
      ).to.be.reverted;
    });

    it("should revert if sender not verified", async () => {
      const { sender, recipient1, erc20, multisend } = await deploy();

      const addresses = [recipient1.address];
      const amounts = [ethers.parseEther("100")];
      const totalAmount = ethers.parseEther("100");

      await erc20.mint(sender.address, totalAmount);
      await erc20
        .connect(sender)
        .approve(await multisend.getAddress(), totalAmount);

      await expect(
        multisend
          .connect(sender)
          .airdropERC20(await erc20.getAddress(), addresses, amounts, totalAmount)
      ).to.be.revertedWithCustomError(multisend, "SenderNotVerified");
    });

    it("should refund surplus amount back to sender", async () => {
      const {
        hub,
        sender,
        recipient1,
        recipient2,
        recipient3,
        erc20,
        multisend,
      } = await deploy();

      await verifyUser(multisend, hub, sender);

      const addresses = [
        recipient1.address,
        recipient2.address,
        recipient3.address,
      ];
      const amounts = [
        ethers.parseEther("1"),
        ethers.parseEther("2"),
        ethers.parseEther("3"),
      ];
      const totalAmount =
        amounts.reduce((acc, val) => acc + val, 0n) + ethers.parseEther("1");

      await erc20.mint(sender.address, totalAmount);
      await erc20
        .connect(sender)
        .approve(await multisend.getAddress(), totalAmount);

      await multisend
        .connect(sender)
        .airdropERC20(await erc20.getAddress(), addresses, amounts, totalAmount);

      expect(await erc20.balanceOf(recipient1.address)).to.equal(amounts[0]);
      expect(await erc20.balanceOf(recipient2.address)).to.equal(amounts[1]);
      expect(await erc20.balanceOf(recipient3.address)).to.equal(amounts[2]);

      const surplus = ethers.parseEther("1");
      expect(await erc20.balanceOf(sender.address)).to.equal(surplus);
      expect(
        await erc20.balanceOf(await multisend.getAddress())
      ).to.equal(0n);
    });

    it("should revert when ERC20 returns false", async () => {
      const {
        hub,
        sender,
        recipient1,
        recipient2,
        recipient3,
        multisend,
      } = await deploy();

      const FalseReturnERC20 = await ethers.getContractFactory(
        "FalseReturnERC20"
      );
      const falseToken = await FalseReturnERC20.deploy();
      await falseToken.waitForDeployment();

      await verifyUser(multisend, hub, sender);

      const addresses = [
        recipient1.address,
        recipient2.address,
        recipient3.address,
      ];
      const amounts = [
        ethers.parseEther("1"),
        ethers.parseEther("2"),
        ethers.parseEther("3"),
      ];
      const totalAmount = ethers.parseEther("6");

      await falseToken.mint(sender.address, totalAmount);
      await falseToken
        .connect(sender)
        .approve(await multisend.getAddress(), totalAmount);

      await expect(
        multisend
          .connect(sender)
          .airdropERC20(
            await falseToken.getAddress(),
            addresses,
            amounts,
            totalAmount
          )
      ).to.be.reverted;

      expect(await falseToken.balanceOf(recipient1.address)).to.equal(0n);
      expect(await falseToken.balanceOf(recipient2.address)).to.equal(0n);
      expect(await falseToken.balanceOf(recipient3.address)).to.equal(0n);
    });
  });

  describe("ETH Airdrop", () => {
    it("should successfully airdrop ETH to multiple recipients", async () => {
      const { hub, sender, recipient1, recipient2, recipient3, multisend } =
        await deploy();

      // Verify sender
      await verifyUser(multisend, hub, sender);

      // Setup airdrop
      const addresses = [
        recipient1.address,
        recipient2.address,
        recipient3.address,
      ];
      const amounts = [
        ethers.parseEther("1"),
        ethers.parseEther("2"),
        ethers.parseEther("3"),
      ];
      const totalAmount = ethers.parseEther("6");

      // Get initial balances
      const initialBalance1 = await ethers.provider.getBalance(
        recipient1.address
      );
      const initialBalance2 = await ethers.provider.getBalance(
        recipient2.address
      );
      const initialBalance3 = await ethers.provider.getBalance(
        recipient3.address
      );

      // Execute airdrop
      await multisend
        .connect(sender)
        .airdropETH(addresses, amounts, { value: totalAmount });

      // Verify balances
      expect(await ethers.provider.getBalance(recipient1.address)).to.equal(
        initialBalance1 + amounts[0]
      );
      expect(await ethers.provider.getBalance(recipient2.address)).to.equal(
        initialBalance2 + amounts[1]
      );
      expect(await ethers.provider.getBalance(recipient3.address)).to.equal(
        initialBalance3 + amounts[2]
      );
    });

    it("should handle single recipient ETH airdrop", async () => {
      const { hub, sender, recipient1, multisend } = await deploy();

      await verifyUser(multisend, hub, sender);

      const addresses = [recipient1.address];
      const amounts = [ethers.parseEther("5")];

      const initialBalance = await ethers.provider.getBalance(
        recipient1.address
      );

      await multisend
        .connect(sender)
        .airdropETH(addresses, amounts, { value: amounts[0] });

      expect(await ethers.provider.getBalance(recipient1.address)).to.equal(
        initialBalance + amounts[0]
      );
    });

    it("should revert if addresses and amounts length mismatch", async () => {
      const { hub, sender, recipient1, recipient2, multisend } =
        await deploy();

      await verifyUser(multisend, hub, sender);

      const addresses = [recipient1.address, recipient2.address];
      const amounts = [ethers.parseEther("1")]; // Only one amount

      await expect(
        multisend
          .connect(sender)
          .airdropETH(addresses, amounts, { value: ethers.parseEther("1") })
      ).to.be.reverted;
    });

    it("should revert if sender not verified", async () => {
      const { sender, recipient1, multisend } = await deploy();

      const addresses = [recipient1.address];
      const amounts = [ethers.parseEther("1")];

      await expect(
        multisend
          .connect(sender)
          .airdropETH(addresses, amounts, { value: amounts[0] })
      ).to.be.revertedWithCustomError(multisend, "SenderNotVerified");
    });
  });

  describe("Admin Functions", () => {
    it("should allow owner to set config id", async () => {
      const { owner, multisend } = await deploy();

      const newConfigId = ethers.keccak256(ethers.toUtf8Bytes("new-config"));
      await multisend.connect(owner).setConfigId(newConfigId);

      expect(await multisend.verificationConfigId()).to.equal(newConfigId);
    });

    it("should not allow non-owner to set config id", async () => {
      const { sender, multisend } = await deploy();

      const newConfigId = ethers.keccak256(ethers.toUtf8Bytes("new-config"));
      await expect(
        multisend.connect(sender).setConfigId(newConfigId)
      ).to.be.revertedWithCustomError(multisend, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to set scope", async () => {
      const { owner, multisend } = await deploy();

      const newScope = 12345n;
      await multisend.connect(owner).setScope(newScope);

      expect(await multisend.getScope()).to.equal(newScope);
    });

    it("should not allow non-owner to set scope", async () => {
      const { sender, multisend } = await deploy();

      const newScope = 12345n;
      await expect(
        multisend.connect(sender).setScope(newScope)
      ).to.be.revertedWithCustomError(multisend, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", () => {
    it("should return scope value", async () => {
      const { multisend } = await deploy();

      const scope = await multisend.getScope();
      // Scope is derived from scopeSeed and contract address
      // In test environment, verify the function is accessible
      expect(scope).to.not.be.undefined;
    });

    it("should return correct verification expiry", async () => {
      const { hub, sender, multisend } = await deploy();

      expect(await multisend.verificationExpiresAt(sender.address)).to.equal(0);

      await verifyUser(multisend, hub, sender);

      const expiryTime = await multisend.verificationExpiresAt(sender.address);
      expect(expiryTime).to.be.gt(0);
    });

    it("should correctly check if sender is verified", async () => {
      const { hub, sender, multisend } = await deploy();

      expect(await multisend.isSenderVerified(sender.address)).to.be.false;

      await verifyUser(multisend, hub, sender);

      expect(await multisend.isSenderVerified(sender.address)).to.be.true;
    });
  });
});
