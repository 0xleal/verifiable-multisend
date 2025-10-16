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

describe("ClaimNative", () => {
  async function deploy() {
    const [deployer, hub, owner, user] = await ethers.getSigners();

    const Claim = await ethers.getContractFactory("TestableClaimNative");
    const claim = await Claim.connect(owner).deploy(
      hub.address,
      "claim-native"
    );
    await claim.waitForDeployment();

    return { deployer, hub, owner, user, claim };
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

  // Build Merkle root and proof for a leaf using OZ's sorted-pairs convention
  function hashPair(a: string, b: string) {
    return ethers.keccak256(
      a.toLowerCase() < b.toLowerCase()
        ? ethers.concat([a, b])
        : ethers.concat([b, a])
    );
  }

  function buildRootAndProof(leaves: string[], leafIndex: number) {
    let level = [...leaves];
    const proof: string[] = [];
    let idx = leafIndex;

    while (level.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : level[i];
        const parent = hashPair(left, right);
        nextLevel.push(parent);
      }

      // capture sibling for the current index
      const isRightNode = idx % 2 === 1;
      const siblingIndex = isRightNode
        ? idx - 1
        : idx + 1 < level.length
        ? idx + 1
        : idx;
      if (level.length > 1) {
        proof.push(level[siblingIndex]);
      }

      idx = Math.floor(idx / 2);
      level = nextLevel;
    }

    const root = level[0];
    return { root, proof };
  }

  it("verifies and claims native token with merkle validation", async () => {
    const { hub, owner, user, claim } = await deploy();
    const signers = await ethers.getSigners();
    const user2 = signers[4];

    // Set config id
    const cfgId = ethers.keccak256(ethers.toUtf8Bytes("claim-native-config"));
    await (claim as any).connect(owner).setConfigId(cfgId);

    // Simulate verification success for two users
    for (const u of [user, user2]) {
      const userIdentifier = BigInt(ethers.getBigInt(u.address));
      const userData = buildUserData(userIdentifier);
      await (claim as any).connect(hub).trigger(userData);
    }

    // Build a 2-leaf merkle tree for both users
    const index0 = 0n;
    const index1 = 1n;
    const amount0 = ethers.parseEther("0.25");
    const amount1 = ethers.parseEther("0.35");
    const leaf0 = computeLeaf(index0, user.address, amount0);
    const leaf1 = computeLeaf(index1, user2.address, amount1);
    const leaves = [leaf0, leaf1];
    const { root, proof: proof0 } = buildRootAndProof(leaves, 0);
    const { proof: proof1 } = buildRootAndProof(leaves, 1);
    await (claim as any).connect(owner).setMerkleRoot(root);

    // Fund the claim contract with total
    const total = amount0 + amount1;
    await owner.sendTransaction({ to: await claim.getAddress(), value: total });

    // User 0 claims and we check balance delta accounting for gas
    const bal0Before = await ethers.provider.getBalance(user.address);
    const tx0 = await (claim as any)
      .connect(user)
      .claim(index0, amount0, proof0);
    const rc0 = await tx0.wait();
    const gas0 = BigInt(rc0!.gasUsed * rc0!.gasPrice!);
    const bal0After = await ethers.provider.getBalance(user.address);
    expect(bal0After + gas0 - bal0Before).to.equal(amount0);

    // User 1 claims and we check balance delta accounting for gas
    const bal1Before = await ethers.provider.getBalance(user2.address);
    const tx1 = await (claim as any)
      .connect(user2)
      .claim(index1, amount1, proof1);
    const rc1 = await tx1.wait();
    const gas1 = BigInt(rc1!.gasUsed * rc1!.gasPrice!);
    const bal1After = await ethers.provider.getBalance(user2.address);
    expect(bal1After + gas1 - bal1Before).to.equal(amount1);

    // Re-claim should fail for one of them
    await expect(
      (claim as any).connect(user).claim(index0, amount0, proof0)
    ).to.be.revertedWithCustomError(claim, "AlreadyClaimed");
  });

  it("verifies and allows multiple wallets to claim native with merkle validation", async () => {
    const { hub, owner, claim } = await deploy();
    const signers = await ethers.getSigners();
    const userA = signers[3];
    const userB = signers[4];
    const userC = signers[5];

    // Set config id
    const cfgId = ethers.keccak256(ethers.toUtf8Bytes("claim-native-config"));
    await (claim as any).connect(owner).setConfigId(cfgId);

    // Simulate verification success for all users
    for (const u of [userA, userB, userC]) {
      const userIdentifier = BigInt(ethers.getBigInt(u.address));
      const userData = buildUserData(userIdentifier);
      await (claim as any).connect(hub).trigger(userData);
    }

    // Build a 3-leaf merkle tree
    const indexA = 0n;
    const indexB = 1n;
    const indexC = 2n;
    const amountA = ethers.parseEther("0.1");
    const amountB = ethers.parseEther("0.2");
    const amountC = ethers.parseEther("0.3");
    const leafA = computeLeaf(indexA, userA.address, amountA);
    const leafB = computeLeaf(indexB, userB.address, amountB);
    const leafC = computeLeaf(indexC, userC.address, amountC);

    const leaves = [leafA, leafB, leafC];
    const { root: merkleRootA, proof: proofA } = buildRootAndProof(leaves, 0);
    const { proof: proofB } = buildRootAndProof(leaves, 1);
    const { proof: proofC } = buildRootAndProof(leaves, 2);

    // Set root once for all users
    await (claim as any).connect(owner).setMerkleRoot(merkleRootA);

    // Fund the claim contract
    const total = amountA + amountB + amountC;
    await owner.sendTransaction({ to: await claim.getAddress(), value: total });

    // User A claims
    const balABefore = await ethers.provider.getBalance(userA.address);
    const txA = await (claim as any)
      .connect(userA)
      .claim(indexA, amountA, proofA);
    const receiptA = await txA.wait();
    const gasA = BigInt(receiptA!.gasUsed * receiptA!.gasPrice!);
    const balAAfter = await ethers.provider.getBalance(userA.address);
    expect(balAAfter + gasA - balABefore).to.equal(amountA);

    // User B claims
    const balBBefore = await ethers.provider.getBalance(userB.address);
    const txB = await (claim as any)
      .connect(userB)
      .claim(indexB, amountB, proofB);
    const receiptB = await txB.wait();
    const gasB = BigInt(receiptB!.gasUsed * receiptB!.gasPrice!);
    const balBAfter = await ethers.provider.getBalance(userB.address);
    expect(balBAfter + gasB - balBBefore).to.equal(amountB);

    // User C claims
    const balCBefore = await ethers.provider.getBalance(userC.address);
    const txC = await (claim as any)
      .connect(userC)
      .claim(indexC, amountC, proofC);
    const receiptC = await txC.wait();
    const gasC = BigInt(receiptC!.gasUsed * receiptC!.gasPrice!);
    const balCAfter = await ethers.provider.getBalance(userC.address);
    expect(balCAfter + gasC - balCBefore).to.equal(amountC);

    // Re-claim should fail for one of them
    await expect(
      (claim as any).connect(userA).claim(indexA, amountA, proofA)
    ).to.be.revertedWithCustomError(claim, "AlreadyClaimed");
  });

  it("reverts with InvalidProof when merkle proof/amount is incorrect", async () => {
    const { hub, owner, claim } = await deploy();
    const [, , , userA, userB] = await ethers.getSigners();

    const cfgId = ethers.keccak256(ethers.toUtf8Bytes("claim-native-config"));
    await (claim as any).connect(owner).setConfigId(cfgId);

    // Verify only userA and userB
    for (const u of [userA, userB]) {
      const userIdentifier = BigInt(ethers.getBigInt(u.address));
      const userData = buildUserData(userIdentifier);
      await (claim as any).connect(hub).trigger(userData);
    }

    const indexA = 0n;
    const indexB = 1n;
    const amountA = ethers.parseEther("0.4");
    const amountB = ethers.parseEther("0.5");
    const leafA = computeLeaf(indexA, userA.address, amountA);
    const leafB = computeLeaf(indexB, userB.address, amountB);
    const leaves = [leafA, leafB];
    const { root, proof: proofA } = buildRootAndProof(leaves, 0);
    await (claim as any).connect(owner).setMerkleRoot(root);

    // Fund
    await owner.sendTransaction({
      to: await claim.getAddress(),
      value: amountA + amountB,
    });

    // Wrong amount for userA should revert InvalidProof
    await expect(
      (claim as any).connect(userA).claim(indexA, amountA + 1n, proofA)
    ).to.be.revertedWithCustomError(claim, "InvalidProof");
  });

  it("reverts when caller not verified", async () => {
    const { owner, claim } = await deploy();
    const [, , , , userB] = await ethers.getSigners();

    // Build a root that includes userB but do not verify userB
    const indexB = 0n;
    const amountB = ethers.parseEther("0.25");
    const leafB = computeLeaf(indexB, userB.address, amountB);
    await (claim as any).connect(owner).setMerkleRoot(leafB);

    await owner.sendTransaction({
      to: await claim.getAddress(),
      value: amountB,
    });

    await expect(
      (claim as any).connect(userB).claim(indexB, amountB, [])
    ).to.be.revertedWithCustomError(claim, "NotVerified");
  });
});
