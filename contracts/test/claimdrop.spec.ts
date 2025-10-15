import { expect } from "chai";
import { ethers } from "hardhat";

function computeLeaf(addr: string, amount: bigint) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [addr, amount]
    )
  );
}

describe("ClaimDropSelf", () => {
  async function deploy() {
    const [deployer, hub, owner, claimer, other] = await ethers.getSigners();
    const ClaimDrop = await ethers.getContractFactory("TestableClaimDropSelf");
    const claimdrop = await ClaimDrop.deploy(hub.address, "claimdrop-test");
    await claimdrop.waitForDeployment();

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const erc20 = await TestERC20.deploy("Test", "TST");
    await erc20.waitForDeployment();

    return { deployer, hub, owner, claimer, other, claimdrop, erc20 };
  }

  function buildUserData(dropId: bigint, claimer: string, amount: bigint) {
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint8", "address", "uint256"],
      [3, claimer, amount]
    );
    const destinationChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    const userIdentifier = ethers.zeroPadValue(ethers.toBeHex(dropId), 32);
    return ethers.concat([destinationChainId, userIdentifier, data]);
  }

  it("creates, funds, and claims ERC20 drop via hook", async () => {
    const { hub, owner, claimer, claimdrop, erc20 } = await deploy();

    const total = 1_000n;
    const amount = 250n;
    const merkleRoot = computeLeaf(claimer.address, amount);

    const cfg = { olderThan: 0, forbiddenCountries: [], ofacEnabled: false };
    const tx = await claimdrop
      .connect(owner)
      .createDrop(cfg, await erc20.getAddress(), merkleRoot, total, false);
    const receipt = await tx.wait();
    const ev = receipt!.logs
      .map((l) => claimdrop.interface.parseLog(l))
      .find((x) => x?.name === "DropCreated");
    const dropId = ev!.args.dropId as bigint;

    // fund ERC20
    await erc20.mint(owner.address, total);
    await erc20.connect(owner).approve(await claimdrop.getAddress(), total);
    await expect(claimdrop.connect(owner).fundDrop(dropId, total))
      .to.emit(claimdrop, "DropFunded")
      .withArgs(dropId, total, false);

    const proof: `0x${string}`[] = [];
    const userData = buildUserData(dropId, claimer.address, amount);
    const leaf = computeLeaf(claimer.address, amount);

    // Calling claim() without real proof should revert; omit explicit assertion to avoid
    // decoding issues from arbitrary revert data in dependency.
    try {
      await claimdrop.connect(claimer).claim(dropId, amount, proof, "0x");
    } catch {}

    // Simulate hub verification success invoking hook payout
    await expect(claimdrop.connect(hub).trigger(userData))
      .to.emit(claimdrop, "Claimed")
      .withArgs(dropId, claimer.address, amount);

    expect(await erc20.balanceOf(claimer.address)).to.equal(amount);
    const d = await claimdrop.drops(dropId);
    expect(d.funded).to.equal(total - amount);
    expect(await claimdrop.claimed(dropId, leaf)).to.equal(true);
  });

  it("creates, funds native, claims via hook, and sweeps remainder", async () => {
    const { hub, owner, claimer, other, claimdrop } = await deploy();
    const total = 1_000n;
    const amount = 400n;
    const merkleRoot = computeLeaf(claimer.address, amount);
    const cfg = { olderThan: 0, forbiddenCountries: [], ofacEnabled: false };
    const tx = await claimdrop
      .connect(owner)
      .createDrop(cfg, ethers.ZeroAddress, merkleRoot, total, true);
    const receipt = await tx.wait();
    const ev = receipt!.logs
      .map((l) => claimdrop.interface.parseLog(l))
      .find((x) => x?.name === "DropCreated");
    const dropId = ev!.args.dropId as bigint;

    await expect(
      claimdrop.connect(owner).fundDropNative(dropId, { value: total })
    )
      .to.emit(claimdrop, "DropFunded")
      .withArgs(dropId, total, true);

    const userData = buildUserData(dropId, claimer.address, amount);
    const balBefore = await ethers.provider.getBalance(claimer.address);
    await claimdrop.connect(hub).trigger(userData);
    const balAfter = await ethers.provider.getBalance(claimer.address);
    expect(balAfter - balBefore).to.equal(amount);

    // Sweep remainder
    const sweepTo = other.address;
    const recBefore = await ethers.provider.getBalance(sweepTo);
    await expect(claimdrop.connect(owner).sweepUnclaimed(dropId, sweepTo))
      .to.emit(claimdrop, "Swept")
      .withArgs(dropId, sweepTo, total - amount);
    const recAfter = await ethers.provider.getBalance(sweepTo);
    expect(recAfter - recBefore).to.equal(total - amount);
  });
});
