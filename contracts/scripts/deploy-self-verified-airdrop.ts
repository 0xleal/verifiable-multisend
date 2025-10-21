import * as dotenv from "dotenv";
dotenv.config();

import { ethers, network } from "hardhat";

async function main() {
  if (network.name !== "celo_sepolia") {
    console.warn(
      `Warning: intended for celo_sepolia, current: ${network.name}`
    );
    return;
  }

  const HUB_V2 = "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74"; // Celo Sepolia Hub V2
  const SCOPE_SEED = "self-verified-airdrop";
  const CONFIG_ID =
    process.env.SELF_CONFIG_ID ||
    "0x32332b93ed35ffa75a313b4b2f3e096490739747c872307590d30cf7e936483a";

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) Deploy the contract with hub + scope seed
  const Factory = await ethers.getContractFactory("SelfVerifiedAirdrop");
  console.log("Scope Seed: ", SCOPE_SEED);
  const contract = await Factory.deploy(HUB_V2, SCOPE_SEED);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("SelfVerifiedAirdrop deployed:", addr);

  // 2) Set config id
  const setCfg = await contract.setConfigId(CONFIG_ID as `0x${string}`);
  await setCfg.wait();
  console.log("ConfigId set:", CONFIG_ID);

  /*
    Integration steps:

    1.  **User Verification (Creator & Claimer):**
        - Both airdrop creators and claimers must first be verified through the Self app.
        - Your frontend will generate a Self verification request using the contract's `verificationConfigId` and its on-chain `scope`.
        - The user completes the verification in their Self app.
        - The Self SDK provides a proof payload to your frontend.
        - Call `contract.verifySelfProof(proofPayload, userData)` to get the user verified on-chain for 30 days.

    2.  **Creating an Airdrop (Verified Creator):**
        - Once verified, a user can create an airdrop.
        - **For ERC20 tokens:**
            - The creator's wallet must approve the deployed contract to spend the `totalAmount` of the ERC20 token.
            - Call `contract.createAirdropERC20(airdropId, merkleRoot, tokenAddress, totalAmount)`.
        - **For ETH:**
            - Call `contract.createAirdropETH(airdropId, merkleRoot)` and send the total ETH amount in the transaction's `value`.
        - `airdropId` is a `bytes32` unique identifier for the airdrop.
        - `merkleRoot` is the root of the Merkle tree containing the airdrop allocations.

    3.  **Claiming an Airdrop (Verified Claimer):**
        - A user wanting to claim must also be verified (see step 1).
        - The frontend can use the `canClaim(airdropId, userAddress, index, amount, proof)` view function to check eligibility before sending a transaction.
        - To claim, the user calls `contract.claim(airdropId, index, amount, proof)`.
        - `airdropId` is the identifier of the airdrop they are claiming from.
        - `index`, `amount`, and `proof` are from the Merkle tree allocation for that user.

    4.  **Verification Expiry:**
        - On-chain verification is valid for 30 days.
        - If a user's verification expires, they must repeat the verification process (step 1) to continue creating or claiming airdrops.
  */
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
