import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";

describe("SelfVerifiedAirdrop", () => {
  async function deploy() {
    const [deployer, hub, owner, creator, claimer1, claimer2] =
      await ethers.getSigners();

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const erc20 = await TestERC20.deploy("Test", "TST");
    await erc20.waitForDeployment();

    const VerifiedAirdrop = await ethers.getContractFactory(
      "TestableVerifiedAirdrop"
    );
    const airdrop = await VerifiedAirdrop.connect(owner).deploy(
      hub.address,
      "verified-airdrop"
    );
    await airdrop.waitForDeployment();

    // Set config id
    const cfgId = ethers.keccak256(
      ethers.toUtf8Bytes("verified-airdrop-config")
    );
    await airdrop.connect(owner).setConfigId(cfgId);

    return {
      deployer,
      hub,
      owner,
      creator,
      claimer1,
      claimer2,
      erc20,
      airdrop,
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

  async function verifyUser(airdrop: any, hub: any, user: any) {
    const userIdentifier = BigInt(ethers.getBigInt(user.address));
    const userData = buildUserData(userIdentifier);
    await airdrop.connect(hub).trigger(userData);
  }

  function createMerkleTree(leaves: { address: string; amount: bigint }[]) {
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
    return { merkleTree, elements };
  }

  it("should create and claim an ERC20 airdrop", async () => {
    const { hub, creator, claimer1, claimer2, erc20, airdrop } = await deploy();

    // 1. Verify creator and claimers
    await verifyUser(airdrop, hub, creator);
    await verifyUser(airdrop, hub, claimer1);
    await verifyUser(airdrop, hub, claimer2);

    // 2. Create Merkle tree
    const leaves = [
      { address: claimer1.address, amount: ethers.parseEther("100") },
      { address: claimer2.address, amount: ethers.parseEther("200") },
    ];
    const { merkleTree } = createMerkleTree(leaves);
    const merkleRoot = merkleTree.getHexRoot();

    // 3. Create airdrop
    const airdropId = ethers.id("my-erc20-airdrop");
    const totalAmount = ethers.parseEther("300");
    await erc20.mint(creator.address, totalAmount);
    await erc20
      .connect(creator)
      .approve(await airdrop.getAddress(), totalAmount);

    await expect(
      airdrop
        .connect(creator)
        .createAirdropERC20(
          airdropId,
          merkleRoot,
          await erc20.getAddress(),
          totalAmount
        )
    ).to.emit(airdrop, "AirdropCreated");

    // 4. Claim
    const leaf1 = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "address", "uint256"],
        [0, claimer1.address, leaves[0].amount]
      )
    );
    const proof1 = merkleTree.getHexProof(leaf1);

    expect(
      await airdrop.canClaim(
        airdropId,
        claimer1.address,
        0,
        leaves[0].amount,
        proof1
      )
    ).to.be.true;

    await expect(
      airdrop.connect(claimer1).claim(airdropId, 0, leaves[0].amount, proof1)
    ).to.emit(airdrop, "Claimed");

    expect(await erc20.balanceOf(claimer1.address)).to.equal(leaves[0].amount);

    // 5. Try to double claim
    await expect(
      airdrop.connect(claimer1).claim(airdropId, 0, leaves[0].amount, proof1)
    ).to.be.revertedWithCustomError(airdrop, "AlreadyClaimed");
  });

  it("should create and claim an ETH airdrop", async () => {
    const { hub, creator, claimer1, airdrop } = await deploy();

    // 1. Verify users
    await verifyUser(airdrop, hub, creator);
    await verifyUser(airdrop, hub, claimer1);

    // 2. Create Merkle tree
    const leaves = [
      { address: claimer1.address, amount: ethers.parseEther("1") },
    ];
    const { merkleTree } = createMerkleTree(leaves);
    const merkleRoot = merkleTree.getHexRoot();

    // 3. Create airdrop
    const airdropId = ethers.id("my-eth-airdrop");
    const totalAmount = ethers.parseEther("1");
    await airdrop
      .connect(creator)
      .createAirdropETH(airdropId, merkleRoot, { value: totalAmount });

    // 4. Claim
    const leaf1 = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "address", "uint256"],
        [0, claimer1.address, leaves[0].amount]
      )
    );
    const proof1 = merkleTree.getHexProof(leaf1);

    const balanceBefore = await ethers.provider.getBalance(claimer1.address);
    const tx = await airdrop
      .connect(claimer1)
      .claim(airdropId, 0, leaves[0].amount, proof1);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const balanceAfter = await ethers.provider.getBalance(claimer1.address);

    expect(balanceAfter - balanceBefore + gasUsed).to.equal(leaves[0].amount);
  });
});
