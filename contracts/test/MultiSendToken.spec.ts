import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiSendToken", () => {
  async function deploy() {
    const [deployer, hub, owner, sender] = await ethers.getSigners();

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const erc20 = await TestERC20.deploy("Test", "TST");
    await erc20.waitForDeployment();

    const MultiSend = await ethers.getContractFactory("TestableMultiSendToken");
    const multisend = await MultiSend.connect(owner).deploy(
      hub.address,
      "multisend-token"
    );
    await multisend.waitForDeployment();

    return { deployer, hub, owner, sender, erc20, multisend };
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

  it("requires verification and sends ERC20 to many using transferFrom", async () => {
    const { hub, owner, sender, erc20, multisend } = await deploy();
    const [r1, r2, r3] = (await ethers.getSigners()).slice(4, 7);

    // Configure Self config id
    const cfgId = ethers.keccak256(
      ethers.toUtf8Bytes("multisend-token-config")
    );
    await (multisend as any).connect(owner).setConfigId(cfgId);

    // Verify sender
    const userIdentifier = BigInt(ethers.getBigInt(sender.address));
    const userData = buildUserData(userIdentifier);
    await (multisend as any).connect(hub).trigger(userData);

    // Mint tokens to sender and approve contract to pull via transferFrom to recipients
    const amounts = [100n, 200n, 300n];
    const total = amounts.reduce((a, b) => a + b, 0n);
    await erc20.mint(sender.address, total);
    await erc20.connect(sender).approve(await multisend.getAddress(), total);

    const recipients = [r1.address, r2.address, r3.address];
    const before = await Promise.all(
      recipients.map((addr) => erc20.balanceOf(addr))
    );

    await (multisend as any)
      .connect(sender)
      .batchSendERC20(await erc20.getAddress(), recipients, amounts);

    const after = await Promise.all(
      recipients.map((addr) => erc20.balanceOf(addr))
    );
    for (let i = 0; i < recipients.length; i++) {
      expect(after[i] - before[i]).to.equal(amounts[i]);
    }

    // Sender balance decreased by total
    const senderBal = await erc20.balanceOf(sender.address);
    expect(senderBal).to.equal(0n);
  });

  it("reverts when sender not verified", async () => {
    const { sender, erc20, multisend } = await deploy();
    const [r1] = (await ethers.getSigners()).slice(4, 5);
    await erc20.mint(sender.address, 10n);
    await expect(
      (multisend as any)
        .connect(sender)
        .batchSendERC20(await erc20.getAddress(), [r1.address], [10n])
    ).to.be.revertedWithCustomError(multisend, "NotVerified");
  });
});
