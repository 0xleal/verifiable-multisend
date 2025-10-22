import { ethers } from "hardhat";
import {
  getNetworkConfig,
  validateEnvironment,
  loadDeployedAddresses,
} from "./config";

/**
 * Relay a verification from Celo to Base
 *
 * This script:
 * 1. Connects to Celo registry
 * 2. Checks if user is verified on Celo
 * 3. Relays verification to Base via Hyperlane
 * 4. Pays Hyperlane fees (usually ~$0.10-0.50)
 *
 * Prerequisites:
 *   - User must be verified on Celo first (via Self.xyz app)
 *   - Both Celo and Base contracts must be deployed
 *
 * Usage:
 *   # Relay your own verification
 *   npx hardhat run scripts/multichain/relay-verification.ts --network celo_sepolia
 *
 *   # Or relay someone else's verification
 *   USER_ADDRESS=0x123... npx hardhat run scripts/multichain/relay-verification.ts --network celo_sepolia
 */
async function main() {
  console.log("\n🔄 Relaying verification from Celo to Base...\n");

  // Validate environment
  validateEnvironment();

  // Load deployed addresses
  const deployedAddresses = loadDeployedAddresses();
  const celoRegistry = deployedAddresses.celoSepolia?.registry;
  const baseRegistry = deployedAddresses.baseSepolia?.registry;

  if (!celoRegistry) {
    throw new Error(
      "❌ Celo registry address not found. Deploy Celo contracts first:\n" +
        "   npx hardhat run scripts/multichain/deploy-celo.ts --network celoSepolia"
    );
  }

  if (!baseRegistry) {
    throw new Error(
      "❌ Base registry address not found. Deploy Base contracts first:\n" +
        "   npx hardhat run scripts/multichain/deploy-base.ts --network baseSepolia"
    );
  }

  // Get network configs
  const celoConfig = getNetworkConfig("celoSepolia");
  const baseConfig = getNetworkConfig("baseSepolia");

  console.log(`📋 Celo Registry: ${celoRegistry}`);
  console.log(`📋 Base Registry: ${baseRegistry}`);
  console.log(`🆔 Base Domain: ${baseConfig.hyperlane.domain}\n`);

  // Get user address (from env or use deployer)
  const [deployer] = await ethers.getSigners();
  const userAddress = process.env.USER_ADDRESS || deployer.address;

  console.log(`👤 Relaying verification for: ${userAddress}`);
  console.log(`💼 Relay caller: ${deployer.address}\n`);

  // Connect to Celo registry
  const celoRegistryContract = await ethers.getContractAt(
    "CeloVerificationRegistry",
    celoRegistry
  );

  // ===== Check verification status on Celo =====
  console.log("🔍 Checking verification status on Celo...");

  const isVerified = await celoRegistryContract.isVerified(userAddress);
  const expiresAt = await celoRegistryContract.verificationExpiresAt(
    userAddress
  );

  if (!isVerified) {
    console.error(`❌ User ${userAddress} is NOT verified on Celo`);
    console.error(`\n📝 To verify:`);
    console.error(`   1. Open Self.xyz mobile app`);
    console.error(`   2. Scan your NFC passport`);
    console.error(`   3. Submit proof to Celo registry: ${celoRegistry}`);
    console.error(`   4. Wait for transaction confirmation`);
    console.error(`   5. Run this script again\n`);
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = Number(expiresAt) - now;
  const daysUntilExpiry = Math.floor(timeUntilExpiry / 86400);

  console.log(`✅ User is verified on Celo`);
  console.log(`   Expires at: ${new Date(Number(expiresAt) * 1000).toISOString()}`);
  console.log(`   Days remaining: ${daysUntilExpiry} days\n`);

  // ===== Estimate Hyperlane fees =====
  console.log("💰 Estimating Hyperlane relay fees...");

  // Hyperlane fees are typically 0.001 - 0.01 ETH for testnet
  // For production, use the actual quote function from Hyperlane
  const estimatedFee = ethers.parseEther("0.005"); // 0.005 ETH estimate
  console.log(`   Estimated fee: ${ethers.formatEther(estimatedFee)} CELO`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`   Your balance: ${ethers.formatEther(balance)} CELO\n`);

  if (balance < estimatedFee) {
    throw new Error(
      `❌ Insufficient balance for relay. Need at least ${ethers.formatEther(estimatedFee)} CELO`
    );
  }

  // ===== Relay verification to Base =====
  console.log("📤 Relaying verification to Base via Hyperlane...");
  console.log(
    `   This will send a cross-chain message with your verification data.\n`
  );

  const baseRegistryBytes32 = ethers.zeroPadValue(baseRegistry, 32);

  try {
    const tx = await celoRegistryContract.relayVerificationTo(
      baseConfig.hyperlane.domain,
      baseRegistryBytes32,
      userAddress,
      { value: estimatedFee }
    );

    console.log(`⏳ Transaction submitted: ${tx.hash}`);
    console.log(`   Waiting for confirmation...`);

    const receipt = await tx.wait();

    console.log(`✅ Transaction confirmed!`);
    console.log(`   Block: ${receipt?.blockNumber}`);
    console.log(
      `   Gas used: ${receipt?.gasUsed.toString()} (${ethers.formatEther(receipt?.gasUsed * receipt?.gasPrice)} CELO)`
    );

    // Find VerificationRelayed event
    const event = receipt?.logs.find((log) => {
      try {
        const parsed = celoRegistryContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        return parsed?.name === "VerificationRelayed";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = celoRegistryContract.interface.parseLog({
        topics: event.topics as string[],
        data: event.data,
      });
      const messageId = parsed?.args[4];
      console.log(`   Hyperlane Message ID: ${messageId}`);
    }

    // ===== Check status on Base =====
    console.log(`\n⏱️  Waiting for Hyperlane to deliver message to Base...`);
    console.log(
      `   This usually takes 1-5 minutes depending on network conditions.`
    );
    console.log(`\n📝 To check Base verification status:`);
    console.log(
      `   npx hardhat run scripts/multichain/check-verification.ts --network baseSepolia`
    );
    console.log(`\n🔗 Track your message:`);
    console.log(`   Hyperlane Explorer: https://explorer.hyperlane.xyz/`);
    console.log(`   Celo Tx: https://sepolia.celoscan.io/tx/${tx.hash}`);

    console.log("\n" + "=".repeat(60));
    console.log("✨ Relay Complete!");
    console.log("=".repeat(60));
    console.log(`\n👤 User: ${userAddress}`);
    console.log(`📍 From: Celo Sepolia`);
    console.log(`📍 To: Base Sepolia`);
    console.log(`⏰ Expires: ${new Date(Number(expiresAt) * 1000).toISOString()}`);
    console.log(
      `💸 Total cost: ~${ethers.formatEther(estimatedFee)} CELO\n`
    );
  } catch (error: any) {
    console.error(`\n❌ Relay failed:`, error.message);

    if (error.message.includes("AccountNotVerified")) {
      console.error(
        `\n💡 The user is not verified or verification has expired.`
      );
    } else if (error.message.includes("MailboxNotConfigured")) {
      console.error(
        `\n💡 Hyperlane mailbox not configured in registry. Check deployment.`
      );
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
