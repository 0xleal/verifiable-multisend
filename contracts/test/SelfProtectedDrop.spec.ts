import { expect } from "chai";
import { ethers } from "hardhat";

describe("SelfProtectedDrop - ETH", () => {
  async function deploy() {
    const [deployer, ...rest] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("SelfProtectedDrop");
    const drop = await Contract.deploy();
    await drop.waitForDeployment();
    return { drop, signers: [deployer, ...rest] };
  }

  it("sends ETH to many recipients and retains extra msg.value as dust", async () => {
    const { drop, signers } = await deploy();
    const [_, s1, s2, s3] = signers;
    const recipients = [s1.address, s2.address, s3.address];
    const amounts = [
      ethers.parseEther("0.01"),
      ethers.parseEther("0.02"),
      ethers.parseEther("0.03"),
    ];
    const total = amounts.reduce((a, b) => a + b, 0n);
    const dust = 7n;

    const before = await Promise.all(
      recipients.map((a) => ethers.provider.getBalance(a))
    );

    // send exact value + dust, ensure exact amounts received and contract retains dust
    await drop.airdropETH(recipients, amounts, { value: total + dust });

    const after = await Promise.all(
      recipients.map((a) => ethers.provider.getBalance(a))
    );
    for (let i = 0; i < recipients.length; i++) {
      expect(after[i] - before[i]).to.equal(amounts[i]);
    }
    const contractBal = await ethers.provider.getBalance(
      await drop.getAddress()
    );
    expect(contractBal).to.equal(dust);
  });

  it("reverts when addresses and amounts length mismatch", async () => {
    const { drop, signers } = await deploy();
    const [_, s1, s2] = signers;
    const recipients = [s1.address, s2.address];
    const amounts = [ethers.parseEther("0.01")];
    await expect(
      drop.airdropETH(recipients, amounts, { value: ethers.parseEther("0.01") })
    ).to.be.reverted;
  });
});

describe("SelfProtectedDrop - ERC20", () => {
  async function deploy() {
    const Contract = await ethers.getContractFactory("SelfProtectedDrop");
    const drop = await Contract.deploy();
    await drop.waitForDeployment();

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const token = await TestERC20.deploy("Test", "TST");
    await token.waitForDeployment();
    return { drop, token };
  }

  it("pulls total from caller then distributes to recipients", async () => {
    const { drop, token } = await deploy();
    const [sender, r1, r2, r3] = await ethers.getSigners();

    const amounts = [100n, 200n, 300n];
    const total = amounts.reduce((a, b) => a + b, 0n);
    await token.mint(sender.address, total);
    await token.connect(sender).approve(await drop.getAddress(), total);

    const recipients = [r1.address, r2.address, r3.address];
    const before = await Promise.all(recipients.map((a) => token.balanceOf(a)));

    await drop
      .connect(sender)
      .airdropERC20(await token.getAddress(), recipients, amounts, total);

    const after = await Promise.all(recipients.map((a) => token.balanceOf(a)));
    for (let i = 0; i < recipients.length; i++) {
      expect(after[i] - before[i]).to.equal(amounts[i]);
    }
    const senderBal = await token.balanceOf(sender.address);
    expect(senderBal).to.equal(0n);
  });

  it("reverts when addresses and amounts length mismatch", async () => {
    const { drop, token } = await deploy();
    const [sender, r1] = await ethers.getSigners();
    await token.mint(sender.address, 10n);
    await token.connect(sender).approve(await drop.getAddress(), 10n);
    await expect(
      drop
        .connect(sender)
        .airdropERC20(await token.getAddress(), [r1.address], [5n, 5n], 10n)
    ).to.be.reverted;
  });
});
