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
    const scopeSeed = ethers.keccak256(ethers.toUtf8Bytes("verified-airdrop"));
    const airdrop = await VerifiedAirdrop.connect(owner).deploy(
      hub.address,
      scopeSeed
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
    const gasUsed = receipt ? receipt.gasUsed * receipt.gasPrice : 0n;
    const balanceAfter = await ethers.provider.getBalance(claimer1.address);

    expect(balanceAfter - balanceBefore + gasUsed).to.equal(leaves[0].amount);
  });

  describe("cancelAirdrop", () => {
    it("should allow creator to cancel ERC20 airdrop and get refund", async () => {
      const { hub, creator, claimer1, claimer2, erc20, airdrop } =
        await deploy();

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

      await airdrop
        .connect(creator)
        .createAirdropERC20(
          airdropId,
          merkleRoot,
          await erc20.getAddress(),
          totalAmount
        );

      // 4. Claimer1 claims their portion
      const leaf1 = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "address", "uint256"],
          [0, claimer1.address, leaves[0].amount]
        )
      );
      const proof1 = merkleTree.getHexProof(leaf1);

      await airdrop
        .connect(claimer1)
        .claim(airdropId, 0, leaves[0].amount, proof1);

      expect(await erc20.balanceOf(claimer1.address)).to.equal(
        leaves[0].amount
      );

      // 5. Creator cancels airdrop and gets refund for unclaimed amount
      const creatorBalanceBefore = await erc20.balanceOf(creator.address);
      const unclaimedAmount = totalAmount - leaves[0].amount;

      await expect(airdrop.connect(creator).cancelAirdrop(airdropId))
        .to.emit(airdrop, "AirdropCancelled")
        .withArgs(airdropId, creator.address, unclaimedAmount);

      const creatorBalanceAfter = await erc20.balanceOf(creator.address);
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(
        unclaimedAmount
      );

      // 6. Verify claimer2 can no longer claim
      const leaf2 = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "address", "uint256"],
          [1, claimer2.address, leaves[1].amount]
        )
      );
      const proof2 = merkleTree.getHexProof(leaf2);

      await expect(
        airdrop.connect(claimer2).claim(airdropId, 1, leaves[1].amount, proof2)
      ).to.be.revertedWithCustomError(airdrop, "AirdropAlreadyCancelled");
    });

    it("should allow creator to cancel ETH airdrop and get refund", async () => {
      const { hub, creator, claimer1, claimer2, airdrop } = await deploy();

      // 1. Verify users
      await verifyUser(airdrop, hub, creator);
      await verifyUser(airdrop, hub, claimer1);
      await verifyUser(airdrop, hub, claimer2);

      // 2. Create Merkle tree
      const leaves = [
        { address: claimer1.address, amount: ethers.parseEther("0.5") },
        { address: claimer2.address, amount: ethers.parseEther("0.5") },
      ];
      const { merkleTree } = createMerkleTree(leaves);
      const merkleRoot = merkleTree.getHexRoot();

      // 3. Create airdrop
      const airdropId = ethers.id("my-eth-airdrop");
      const totalAmount = ethers.parseEther("1");
      await airdrop
        .connect(creator)
        .createAirdropETH(airdropId, merkleRoot, { value: totalAmount });

      // 4. Claimer1 claims their portion
      const leaf1 = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "address", "uint256"],
          [0, claimer1.address, leaves[0].amount]
        )
      );
      const proof1 = merkleTree.getHexProof(leaf1);

      await airdrop
        .connect(claimer1)
        .claim(airdropId, 0, leaves[0].amount, proof1);

      // 5. Creator cancels airdrop and gets refund
      const creatorBalanceBefore = await ethers.provider.getBalance(
        creator.address
      );
      const unclaimedAmount = totalAmount - leaves[0].amount;

      const tx = await airdrop.connect(creator).cancelAirdrop(airdropId);
      const receipt = await tx.wait();
      const gasUsed = receipt ? receipt.gasUsed * receipt.gasPrice : 0n;

      const creatorBalanceAfter = await ethers.provider.getBalance(
        creator.address
      );

      expect(creatorBalanceAfter - creatorBalanceBefore + gasUsed).to.equal(
        unclaimedAmount
      );
    });

    it("should revert if non-creator tries to cancel airdrop", async () => {
      const { hub, creator, claimer1, erc20, airdrop } = await deploy();

      // 1. Verify creator and claimer
      await verifyUser(airdrop, hub, creator);
      await verifyUser(airdrop, hub, claimer1);

      // 2. Create airdrop
      const leaves = [
        { address: claimer1.address, amount: ethers.parseEther("100") },
      ];
      const { merkleTree } = createMerkleTree(leaves);
      const merkleRoot = merkleTree.getHexRoot();

      const airdropId = ethers.id("my-erc20-airdrop");
      const totalAmount = ethers.parseEther("100");
      await erc20.mint(creator.address, totalAmount);
      await erc20
        .connect(creator)
        .approve(await airdrop.getAddress(), totalAmount);

      await airdrop
        .connect(creator)
        .createAirdropERC20(
          airdropId,
          merkleRoot,
          await erc20.getAddress(),
          totalAmount
        );

      // 3. Non-creator tries to cancel
      await expect(
        airdrop.connect(claimer1).cancelAirdrop(airdropId)
      ).to.be.revertedWithCustomError(airdrop, "NotCreator");
    });

    it("should revert if trying to cancel non-existent airdrop", async () => {
      const { creator, airdrop } = await deploy();

      const nonExistentId = ethers.id("non-existent-airdrop");

      await expect(
        airdrop.connect(creator).cancelAirdrop(nonExistentId)
      ).to.be.revertedWithCustomError(airdrop, "AirdropNotFound");
    });

    it("should handle cancellation when all funds have been claimed", async () => {
      const { hub, creator, claimer1, erc20, airdrop } = await deploy();

      // 1. Verify users
      await verifyUser(airdrop, hub, creator);
      await verifyUser(airdrop, hub, claimer1);

      // 2. Create airdrop
      const leaves = [
        { address: claimer1.address, amount: ethers.parseEther("100") },
      ];
      const { merkleTree } = createMerkleTree(leaves);
      const merkleRoot = merkleTree.getHexRoot();

      const airdropId = ethers.id("my-erc20-airdrop");
      const totalAmount = ethers.parseEther("100");
      await erc20.mint(creator.address, totalAmount);
      await erc20
        .connect(creator)
        .approve(await airdrop.getAddress(), totalAmount);

      await airdrop
        .connect(creator)
        .createAirdropERC20(
          airdropId,
          merkleRoot,
          await erc20.getAddress(),
          totalAmount
        );

      // 3. Claimer claims all funds
      const leaf1 = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "address", "uint256"],
          [0, claimer1.address, leaves[0].amount]
        )
      );
      const proof1 = merkleTree.getHexProof(leaf1);

      await airdrop
        .connect(claimer1)
        .claim(airdropId, 0, leaves[0].amount, proof1);

      // 4. Creator cancels airdrop (should get 0 refund)
      const creatorBalanceBefore = await erc20.balanceOf(creator.address);

      await expect(airdrop.connect(creator).cancelAirdrop(airdropId))
        .to.emit(airdrop, "AirdropCancelled")
        .withArgs(airdropId, creator.address, 0);

      const creatorBalanceAfter = await erc20.balanceOf(creator.address);
      expect(creatorBalanceAfter).to.equal(creatorBalanceBefore);
    });

    it("should revert on duplicate cancel and prohibit recreating same id", async () => {
      const { hub, creator, claimer1, claimer2, erc20, airdrop } =
        await deploy();

      await verifyUser(airdrop, hub, creator);
      await verifyUser(airdrop, hub, claimer1);
      await verifyUser(airdrop, hub, claimer2);

      const leaves = [
        { address: claimer1.address, amount: ethers.parseEther("10") },
        { address: claimer2.address, amount: ethers.parseEther("20") },
      ];
      const { merkleTree } = createMerkleTree(leaves);
      const merkleRoot = merkleTree.getHexRoot();

      const airdropId = ethers.id("duplicate-airdrop");
      const totalAmount = ethers.parseEther("30");
      await erc20.mint(creator.address, totalAmount);
      await erc20
        .connect(creator)
        .approve(await airdrop.getAddress(), totalAmount);

      await airdrop
        .connect(creator)
        .createAirdropERC20(
          airdropId,
          merkleRoot,
          await erc20.getAddress(),
          totalAmount
        );

      await airdrop.connect(creator).cancelAirdrop(airdropId);

      await expect(
        airdrop.connect(creator).cancelAirdrop(airdropId)
      ).to.be.revertedWithCustomError(airdrop, "AirdropAlreadyCancelled");

      await expect(
        airdrop
          .connect(creator)
          .createAirdropERC20(
            airdropId,
            merkleRoot,
            await erc20.getAddress(),
            totalAmount
          )
      ).to.be.revertedWithCustomError(airdrop, "AirdropExists");
    });
  });
});
