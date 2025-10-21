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
  const SCOPE_SEED = "self-verified-multisend";
  const CONFIG_ID =
    process.env.SELF_CONFIG_ID ||
    "0x32332b93ed35ffa75a313b4b2f3e096490739747c872307590d30cf7e936483a";

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) Deploy the contract with hub + scope seed
  const Factory = await ethers.getContractFactory("SelfVerifiedMultiSend");
  console.log("Scope Seed: ", SCOPE_SEED);
  const contract = await Factory.deploy(HUB_V2, SCOPE_SEED);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("SelfVerifiedMultiSend deployed:", addr);

  // 2) Set config id
  const setCfg = await contract.setConfigId(CONFIG_ID as `0x${string}`);
  await setCfg.wait();
  console.log("ConfigId set:", CONFIG_ID);

  /*
    Integration steps:

    1.  **User Verification (Sender):**
        - Senders must first be verified through the Self app.
        - Your frontend will generate a Self verification request using the contract's `verificationConfigId` and its on-chain `scope`.
        - The user completes the verification in their Self app.
        - The Self SDK provides a proof payload to your frontend.
        - Call `contract.verifySelfProof(proofPayload, userData)` to get the user verified on-chain for 30 days.

    2.  **Sending ERC20 Tokens (Verified Sender):**
        - Once verified, a user can perform bulk token transfers.
        - The sender's wallet must approve the deployed contract to spend the `totalAmount` of the ERC20 token.
        - Call `contract.airdropERC20(tokenAddress, addresses, amounts, totalAmount)`.
        - `addresses` is an array of recipient addresses.
        - `amounts` is an array of token amounts corresponding to each address.
        - `totalAmount` is the sum of all amounts that will be transferred from the sender.
        - The contract uses assembly for gas optimization.

    3.  **Sending ETH (Verified Sender):**
        - Once verified, a user can perform bulk ETH transfers.
        - Call `contract.airdropETH(addresses, amounts)` and send the total ETH amount in the transaction's `value`.
        - `addresses` is an array of recipient addresses.
        - `amounts` is an array of ETH amounts corresponding to each address.
        - The total `msg.value` should equal the sum of all amounts.

    4.  **Verification Expiry:**
        - On-chain verification is valid for 30 days.
        - If a user's verification expires, they must repeat the verification process (step 1) to continue using the multisend functionality.

    5.  **View Functions:**
        - `isSenderVerified(address)` - Check if an address is currently verified
        - `verificationExpiresAt(address)` - Get the expiry timestamp for an address
        - `getScope()` - Get the current verification scope used by the contract
  */
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
