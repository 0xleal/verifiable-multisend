import { expect } from "chai";
import { ethers } from "hardhat";

function computeLeaf(index: bigint, addr: string, amount: bigint) {
  return ethers.keccak256(
    ethers.solidityPacked(
      ["uint256", "address", "uint256"],
      [index, addr, amount]
    )
  );
}

describe("ClaimToken", () => {
  async function deploy() {
    const [deployer, hub, owner, user] = await ethers.getSigners();

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const erc20 = await TestERC20.deploy("Test", "TST");
    await erc20.waitForDeployment();

    const Claim = await ethers.getContractFactory("TestableClaimToken");
    const claim = await Claim.connect(owner).deploy(
      hub.address,
      "claim-token",
      await erc20.getAddress()
    );
    await claim.waitForDeployment();

    return { deployer, hub, owner, user, erc20, claim };
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

  it("verifies and claims ERC20 with merkle validation", async () => {
    const { hub, owner, user, erc20, claim } = await deploy();

    // Set config id
    const cfgId = ethers.keccak256(ethers.toUtf8Bytes("claim-token-config"));
    await (claim as any).connect(owner).setConfigId(cfgId);

    // Simulate verification success
    const userIdentifier = BigInt(ethers.getBigInt(user.address));
    const userData = buildUserData(userIdentifier);
    await (claim as any).connect(hub).trigger(userData);

    // Prepare simple 1-leaf merkle where root == leaf
    const index = 0n;
    const amount = 123n;
    const leaf = computeLeaf(index, user.address, amount);
    await (claim as any).connect(owner).setMerkleRoot(leaf);

    // Fund the claim contract
    await erc20.mint(owner.address, amount);
    await erc20.connect(owner).transfer(await claim.getAddress(), amount);

    // Claim
    const balBefore = await erc20.balanceOf(user.address);
    await expect((claim as any).connect(user).claim(index, amount, []))
      .to.emit(claim, "Claimed")
      .withArgs(index, user.address, amount);
    const balAfter = await erc20.balanceOf(user.address);
    expect(balAfter - balBefore).to.equal(amount);

    // Re-claim should fail
    await expect(
      (claim as any).connect(user).claim(index, amount, [])
    ).to.be.revertedWithCustomError(claim, "AlreadyClaimed");
  });
});
