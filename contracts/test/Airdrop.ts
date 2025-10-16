import { expect } from "chai";
import { ethers } from "hardhat";

function computeLeaf(index: bigint, addr: string, amount: bigint) {
  // Match contract's keccak256(abi.encodePacked(index, msg.sender, amount))
  return ethers.keccak256(
    ethers.solidityPacked(
      ["uint256", "address", "uint256"],
      [index, addr, amount]
    )
  );
}

describe("Airdrop (self-example)", () => {
  async function deploy() {
    const [deployer, hub, owner, user] = await ethers.getSigners();

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const erc20 = await TestERC20.deploy("Test", "TST");
    await erc20.waitForDeployment();

    const Airdrop = await ethers.getContractFactory("TestableAirdrop");
    const airdrop = (await Airdrop.connect(owner).deploy(
      hub.address,
      "airdrop-example",
      await erc20.getAddress()
    )) as any;
    await airdrop.waitForDeployment();

    return { deployer, hub, owner, user, erc20, airdrop };
  }

  function buildUserData(userIdentifier: bigint) {
    const destinationChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    const userIdentifier32 = ethers.zeroPadValue(
      ethers.toBeHex(userIdentifier),
      32
    );
    const data = "0x"; // Airdrop hook doesn't decode userData beyond headers
    return ethers.concat([destinationChainId, userIdentifier32, data]);
  }

  it("registers via hook and allows merkle claim", async () => {
    const { hub, owner, user, erc20, airdrop } = await deploy();

    // Owner configures claim and registration windows
    await (airdrop as any).connect(owner).openRegistration();
    await (airdrop as any).connect(owner).openClaim();

    // Set a fixed verification config id used by getConfigId()
    const cfgId = ethers.keccak256(ethers.toUtf8Bytes("test-config"));
    await (airdrop as any).connect(owner).setConfigId(cfgId);

    // Simulate verification success registering the user
    const userIdentifier = BigInt(ethers.getBigInt(user.address));
    const userData = buildUserData(userIdentifier);
    await (airdrop as any).connect(hub).trigger(userData);

    // Close registration to enable claim path in contract
    await (airdrop as any).connect(owner).closeRegistration();

    // Prepare simple 1-leaf merkle where root == leaf
    const index = 0n;
    const amount = 500n;
    const leaf = computeLeaf(index, user.address, amount);
    await (airdrop as any).connect(owner).setMerkleRoot(leaf);

    // Fund token to airdrop contract
    await erc20.mint(owner.address, amount);
    await erc20.connect(owner).transfer(await airdrop.getAddress(), amount);

    // Claim with empty proof under this minimal root==leaf approach
    const balBefore = await erc20.balanceOf(user.address);
    await expect(
      (airdrop as any).connect(user).claim(index, amount, [] /* proof */)
    )
      .to.emit(airdrop, "Claimed")
      .withArgs(index, user.address, amount);

    const balAfter = await erc20.balanceOf(user.address);
    expect(balAfter - balBefore).to.equal(amount);
  });
});
