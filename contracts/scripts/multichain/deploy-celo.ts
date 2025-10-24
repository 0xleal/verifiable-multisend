import { ethers } from "hardhat";
import {
  getNetworkConfig,
  validateEnvironment,
  saveDeployedAddresses,
  VERIFICATION_SCOPE_SEED,
  VERIFICATION_CONFIG_ID,
} from "./config";

/**
 * Deploy all contracts to Celo Sepolia (source chain)
 *
 * This deploys:
 * 1. CeloVerificationRegistry - Receives Self.xyz proofs, can relay to other chains
 * 2. SelfVerifiedMultiSend - For bulk token distributions
 * 3. SelfVerifiedAirdrop - For merkle-based airdrops
 *
 * Usage:
 *   npx hardhat run scripts/multichain/deploy-celo.ts --network celo_sepolia
 */
async function main() {
  console.log("\n🚀 Deploying HumanPay to Celo Sepolia...\n");

  // Validate environment
  validateEnvironment();

  // Get network config
  const networkConfig = getNetworkConfig("celoSepolia");
  console.log(`📡 Network: ${networkConfig.name}`);
  console.log(`⛓️  Chain ID: ${networkConfig.chainId}`);
  console.log(`📮 Hyperlane Mailbox: ${networkConfig.hyperlane.mailbox}`);
  console.log(`🆔 Hyperlane Domain: ${networkConfig.hyperlane.domain}`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} CELO`);

  if (balance < ethers.parseEther("0.1")) {
    console.warn(
      "⚠️  Warning: Low balance. You may need more CELO for deployment."
    );
  }

  // Check if Self.xyz Hub is configured
  if (!networkConfig.selfxyz.hubV2) {
    throw new Error(
      "❌ Self.xyz Hub V2 address not configured for Celo Sepolia.\n" +
        "Please update config.ts with the correct Hub address."
    );
  }

  console.log(`\n🔐 Self.xyz Hub V2: ${networkConfig.selfxyz.hubV2}`);
  console.log(`🌱 Verification Scope Seed: "${VERIFICATION_SCOPE_SEED}"`);

  // ===== 1. Deploy CeloVerificationRegistry =====
  console.log("\n📝 [1/3] Deploying CeloVerificationRegistry...");

  const CeloRegistry = await ethers.getContractFactory(
    "CeloVerificationRegistry"
  );
  const celoRegistry = await CeloRegistry.deploy(
    networkConfig.selfxyz.hubV2,
    VERIFICATION_SCOPE_SEED,
    networkConfig.hyperlane.mailbox
  );
  await celoRegistry.waitForDeployment();

  const registryAddress = await celoRegistry.getAddress();
  console.log(`✅ CeloVerificationRegistry deployed: ${registryAddress}`);

  // Set verification config ID
  if (VERIFICATION_CONFIG_ID !== ethers.ZeroHash) {
    console.log(`   Setting verification config ID...`);
    const tx = await celoRegistry.setConfigId(VERIFICATION_CONFIG_ID);
    await tx.wait();
    console.log(`   ✓ Config ID set: ${VERIFICATION_CONFIG_ID}`);
  } else {
    console.log(
      `   ⚠️  Warning: Using default config ID (0x0). Update config.ts with your Self.xyz config.`
    );
  }

  // Get scope for reference
  const scope = await celoRegistry.getScope();
  console.log(`   📊 Verification Scope: ${scope}`);

  // ===== 2. Deploy SelfVerifiedMultiSend =====
  console.log("\n📝 [2/3] Deploying SelfVerifiedMultiSend...");

  const MultiSend = await ethers.getContractFactory("SelfVerifiedMultiSend");
  const multiSend = await MultiSend.deploy(registryAddress);
  await multiSend.waitForDeployment();

  const multiSendAddress = await multiSend.getAddress();
  console.log(`✅ SelfVerifiedMultiSend deployed: ${multiSendAddress}`);
  console.log(`   ✓ Connected to registry: ${registryAddress}`);

  // ===== 3. Deploy SelfVerifiedAirdrop =====
  console.log("\n📝 [3/3] Deploying SelfVerifiedAirdrop...");

  const Airdrop = await ethers.getContractFactory("SelfVerifiedAirdrop");
  const airdrop = await Airdrop.deploy(registryAddress);
  await airdrop.waitForDeployment();

  const airdropAddress = await airdrop.getAddress();
  console.log(`✅ SelfVerifiedAirdrop deployed: ${airdropAddress}`);
  console.log(`   ✓ Connected to registry: ${registryAddress}`);

  // ===== Summary =====
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Celo Sepolia Deployment Complete!");
  console.log("=".repeat(60));
  console.log(`\n📋 Deployed Contracts:`);
  console.log(`   CeloVerificationRegistry: ${registryAddress}`);
  console.log(`   SelfVerifiedMultiSend:    ${multiSendAddress}`);
  console.log(`   SelfVerifiedAirdrop:      ${airdropAddress}`);

  console.log(`\n🔗 Block Explorer URLs:`);
  console.log(
    `   Registry:  https://sepolia.celoscan.io/address/${registryAddress}`
  );
  console.log(
    `   MultiSend: https://sepolia.celoscan.io/address/${multiSendAddress}`
  );
  console.log(
    `   Airdrop:   https://sepolia.celoscan.io/address/${airdropAddress}`
  );

  console.log(`\n📝 Next Steps:`);
  console.log(`   1. Verify contracts on Celoscan (optional)`);
  console.log(`   2. Deploy to Base Sepolia: npx hardhat run scripts/multichain/deploy-base.ts --network base_sepolia`);
  console.log(`   3. Configure trusted sender on Base registry`);
  console.log(`   4. Test verification: Use Self.xyz app to scan passport`);
  console.log(`   5. Relay verification: npx hardhat run scripts/multichain/relay-verification.ts`);

  // Save addresses
  saveDeployedAddresses("celoSepolia", {
    registry: registryAddress,
    multiSend: multiSendAddress,
    airdrop: airdropAddress,
  });

  console.log("\n✨ Done!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
