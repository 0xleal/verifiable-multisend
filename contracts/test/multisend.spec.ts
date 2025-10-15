import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiSendSelfGuarded", () => {
  async function deploy() {
    const [deployer, hub, sender, r1, r2] = await ethers.getSigners();
    const MultiSend = await ethers.getContractFactory(
      "TestableMultiSendSelfGuarded"
    );
    const multisend = await MultiSend.deploy(
      hub.address,
      "multisend-test",
      ethers.keccak256(ethers.toUtf8Bytes("human-only-config"))
    );
    await multisend.waitForDeployment();

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const erc20 = await TestERC20.deploy("Test", "TST");
    await erc20.waitForDeployment();

    // Mint to sender
    await erc20.mint(sender.address, 10_000n);

    return { deployer, hub, sender, r1, r2, multisend, erc20 };
  }

  function buildUserDataERC20(
    from: string,
    token: string,
    recipients: string[],
    amounts: bigint[]
  ) {
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint8", "address", "address", "address[]", "uint256[]"],
      [1, token, from, recipients, amounts]
    );
    const destinationChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    const userIdentifier = ethers.zeroPadValue(from, 32);
    return ethers.concat([destinationChainId, userIdentifier, data]);
  }

  function buildUserDataNative(
    from: string,
    recipients: string[],
    amounts: bigint[]
  ) {
    const total = amounts.reduce((a, b) => a + b, 0n);
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint8", "address", "address[]", "uint256[]", "uint256"],
      [2, from, recipients, amounts, total]
    );
    const destinationChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    const userIdentifier = ethers.zeroPadValue(from, 32);
    return {
      userData: ethers.concat([destinationChainId, userIdentifier, data]),
      total,
    };
  }

  it("sends ERC20 in batch via onVerificationSuccess hook", async () => {
    const { hub, sender, r1, r2, multisend, erc20 } = await deploy();

    const recipients = [r1.address, r2.address];
    const amounts = [100n, 250n];
    const total = amounts[0] + amounts[1];

    await erc20.connect(sender).approve(await multisend.getAddress(), total);

    const userData = buildUserDataERC20(
      sender.address,
      await erc20.getAddress(),
      recipients,
      amounts
    );

    await expect(multisend.connect(hub).trigger(userData))
      .to.emit(multisend, "BatchSent")
      .withArgs(
        sender.address,
        await erc20.getAddress(),
        false,
        recipients.length,
        total
      );

    expect(await erc20.balanceOf(r1.address)).to.equal(amounts[0]);
    expect(await erc20.balanceOf(r2.address)).to.equal(amounts[1]);
    expect(await erc20.balanceOf(sender.address)).to.equal(10_000n - total);
  });

  it("reverts on too many recipients (ERC20)", async () => {
    const { hub, sender, multisend, erc20 } = await deploy();
    const recipients = Array.from(
      { length: 201 },
      (_, i) => ethers.Wallet.createRandom().address
    );
    const amounts = Array.from({ length: 201 }, () => 1n);
    const total = 201n;
    await erc20.connect(sender).approve(await multisend.getAddress(), total);

    const userData = buildUserDataERC20(
      sender.address,
      await erc20.getAddress(),
      recipients,
      amounts
    );
    await expect(
      multisend.connect(hub).trigger(userData)
    ).to.be.revertedWithCustomError(multisend, "TooManyRecipients");
  });

  it("sends native in batch via onVerificationSuccess hook", async () => {
    const { hub, sender, r1, r2, multisend } = await deploy();
    const recipients = [r1.address, r2.address];
    const amounts = [123n, 456n];
    const { userData, total } = buildUserDataNative(
      sender.address,
      recipients,
      amounts
    );

    // Fund the contract with the total ETH
    await sender.sendTransaction({
      to: await multisend.getAddress(),
      value: total,
    });

    const bal1Before = await ethers.provider.getBalance(r1.address);
    const bal2Before = await ethers.provider.getBalance(r2.address);

    await expect(multisend.connect(hub).trigger(userData))
      .to.emit(multisend, "BatchSent")
      .withArgs(
        sender.address,
        ethers.ZeroAddress,
        true,
        recipients.length,
        total
      );

    const bal1After = await ethers.provider.getBalance(r1.address);
    const bal2After = await ethers.provider.getBalance(r2.address);
    expect(bal1After - bal1Before).to.equal(amounts[0]);
    expect(bal2After - bal2Before).to.equal(amounts[1]);
  });

  it("reverts on zero recipient (native)", async () => {
    const { hub, sender, multisend } = await deploy();
    const recipients = [ethers.ZeroAddress];
    const amounts = [1n];
    const { userData, total } = buildUserDataNative(
      sender.address,
      recipients,
      amounts
    );
    // Fund
    await sender.sendTransaction({
      to: await multisend.getAddress(),
      value: total,
    });

    await expect(
      multisend.connect(hub).trigger(userData)
    ).to.be.revertedWithCustomError(multisend, "ZeroAddress");
  });
});
