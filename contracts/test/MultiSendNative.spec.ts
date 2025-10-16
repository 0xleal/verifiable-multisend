import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiSendNative", () => {
  async function deploy() {
    const [deployer, hub, owner, sender] = await ethers.getSigners();

    const MultiSend = await ethers.getContractFactory(
      "TestableMultiSendNative"
    );
    const multisend = await MultiSend.connect(owner).deploy(
      hub.address,
      "multisend-native"
    );
    await multisend.waitForDeployment();

    return { deployer, hub, owner, sender, multisend };
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

  it("requires verification and sends native to many", async () => {
    const { hub, owner, sender, multisend } = await deploy();
    const [r1, r2, r3] = (await ethers.getSigners()).slice(4, 7);

    // Configure Self config id
    const cfgId = ethers.keccak256(
      ethers.toUtf8Bytes("multisend-native-config")
    );
    await (multisend as any).connect(owner).setConfigId(cfgId);

    // Verify sender
    const userIdentifier = BigInt(ethers.getBigInt(sender.address));
    const userData = buildUserData(userIdentifier);
    await (multisend as any).connect(hub).trigger(userData);

    const recipients = [r1.address, r2.address, r3.address];
    const amounts = [
      ethers.parseEther("0.11"),
      ethers.parseEther("0.22"),
      ethers.parseEther("0.33"),
    ];
    const total = amounts.reduce((a, b) => a + b, 0n);

    const before = await Promise.all(
      recipients.map((addr) => ethers.provider.getBalance(addr))
    );

    // Send native
    await (multisend as any)
      .connect(sender)
      .batchSendNative(recipients, amounts, { value: total });

    const after = await Promise.all(
      recipients.map((addr) => ethers.provider.getBalance(addr))
    );
    for (let i = 0; i < recipients.length; i++) {
      expect(after[i] - before[i]).to.equal(amounts[i]);
    }
  });

  it("reverts when sender not verified", async () => {
    const { owner, sender, multisend } = await deploy();
    const [r1] = (await ethers.getSigners()).slice(4, 5);
    const recipients = [r1.address];
    const amounts = [ethers.parseEther("0.01")];
    await expect(
      (multisend as any)
        .connect(sender)
        .batchSendNative(recipients, amounts, { value: amounts[0] })
    ).to.be.revertedWithCustomError(multisend, "NotVerified");
  });

  it("reverts on insufficient msg.value and refunds dust", async () => {
    const { hub, owner, sender, multisend } = await deploy();
    const [r1, r2] = (await ethers.getSigners()).slice(4, 6);
    const recipients = [r1.address, r2.address];
    const amounts = [ethers.parseEther("0.02"), ethers.parseEther("0.03")];
    const total = amounts[0] + amounts[1];

    // Verify sender
    const userIdentifier = BigInt(ethers.getBigInt(sender.address));
    const userData = buildUserData(userIdentifier);
    await (multisend as any).connect(hub).trigger(userData);

    await expect(
      (multisend as any)
        .connect(sender)
        .batchSendNative(recipients, amounts, { value: total - 1n })
    ).to.be.revertedWithCustomError(multisend, "InsufficientMsgValue");

    // Check dust refund by asserting contract doesn't retain dust and recipients got exact amounts
    const contractAddr = await multisend.getAddress();
    const r1Before = await ethers.provider.getBalance(r1.address);
    const r2Before = await ethers.provider.getBalance(r2.address);
    await (multisend as any)
      .connect(sender)
      .batchSendNative(recipients, amounts, { value: total + 7n });
    const r1After = await ethers.provider.getBalance(r1.address);
    const r2After = await ethers.provider.getBalance(r2.address);
    expect(r1After - r1Before).to.equal(amounts[0]);
    expect(r2After - r2Before).to.equal(amounts[1]);
    const contractBal = await ethers.provider.getBalance(contractAddr);
    expect(contractBal).to.equal(0n);
  });
});
