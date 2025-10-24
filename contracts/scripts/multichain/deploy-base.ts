import { ethers } from "hardhat";
import {
  getNetworkConfig,
  validateEnvironment,
  saveDeployedAddresses,
  loadDeployedAddresses,
  VERIFICATION_SCOPE_SEED,
} from "./config";

/**
 * Deploy all contracts to Base Sepolia (destination chain)
 *
 * This deploys:
 * 1. CrossChainVerificationRegistry - Receives verification from Celo via Hyperlane
 * 2. SelfVerifiedMultiSend - Same contract as Celo, but uses cross-chain registry
 * 3. SelfVerifiedAirdrop - Same contract as Celo, but uses cross-chain registry
 *
 * Prerequisites:
 *   - Celo contracts must be deployed first (to get registry address for trusted sender)
 *
 * Usage:
 *   npx hardhat run scripts/multichain/deploy-base.ts --network base_sepolia
 */

// Helper to ensure clean nonce management
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("\n🚀 Deploying HumanPay to Base Sepolia...\n");

  // Validate environment
  validateEnvironment();

  // Load Celo registry address from deployed-addresses.json
  const deployedAddresses = loadDeployedAddresses();
  const celoRegistry = deployedAddresses.celoSepolia?.registry;

  if (!celoRegistry) {
    console.warn(
      "⚠️  Warning: Celo registry address not found in deployed-addresses.json",
    );
    console.warn(
      "   You'll need to manually add the Celo registry as a trusted sender later.",
    );
  } else {
    console.log(`📋 Celo Registry (for trusted sender): ${celoRegistry}`);
  }

  // Get network config
  const baseConfig = getNetworkConfig("baseSepolia");
  const celoConfig = getNetworkConfig("celoSepolia");

  console.log(`📡 Network: ${baseConfig.name}`);
  console.log(`⛓️  Chain ID: ${baseConfig.chainId}`);
  console.log(`📮 Hyperlane Mailbox: ${baseConfig.hyperlane.mailbox}`);
  console.log(`🆔 Hyperlane Domain: ${baseConfig.hyperlane.domain}`);
  console.log(`🔗 Source Domain (Celo): ${celoConfig.hyperlane.domain}`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.01")) {
    console.warn(
      "⚠️  Warning: Low balance. You may need more ETH for deployment.",
    );
  }

  // We need the scope from Celo registry - if we have it deployed, calculate it
  // Otherwise, use a placeholder and warn user
  console.log(`\n🌱 Verification Scope Seed: "${VERIFICATION_SCOPE_SEED}"`);

  // Calculate scope the same way Celo does (for compatibility)
  // Scope = keccak256(abi.encodePacked(scopeSeed, address(this)))
  // We'll use a placeholder since we don't have the exact Celo registry address at compile time
  // The actual scope will be fetched from Celo registry if available

  let scope = BigInt(0);
  if (celoRegistry) {
    console.log(`📊 Fetching scope from Celo registry...`);
    try {
      // Connect to Celo to read scope
      const celoProvider = new ethers.JsonRpcProvider(celoConfig.rpcUrl);
      const celoRegistryContract = await ethers.getContractAt(
        "CeloVerificationRegistry",
        celoRegistry,
        celoProvider,
      );
      scope = await celoRegistryContract.getScope();
      console.log(`✓ Scope from Celo: ${scope}`);
    } catch (error) {
      console.warn(
        `⚠️  Could not fetch scope from Celo. Using calculated value.`,
      );
      // Fallback: calculate scope hash manually
      const scopeHash = ethers.keccak256(
        ethers.solidityPacked(
          ["string", "address"],
          [VERIFICATION_SCOPE_SEED, celoRegistry],
        ),
      );
      scope = BigInt(scopeHash);
      console.log(`⚠️  Calculated scope: ${scope}`);
    }
  } else {
    console.warn(
      `⚠️  No Celo registry address. Using default scope. You MUST update this!`,
    );
    scope = BigInt(12345); // Placeholder
  }

  // ===== 1. Deploy CrossChainVerificationRegistry =====
  console.log("\n📝 [1/3] Deploying CrossChainVerificationRegistry...");

  const CrossChainRegistry = await ethers.getContractFactory(
    "CrossChainVerificationRegistry",
  );
  const baseRegistry = await CrossChainRegistry.deploy(
    baseConfig.hyperlane.mailbox,
    celoConfig.hyperlane.domain, // Source domain (Celo)
    scope, // Scope from Celo registry
  );
  await baseRegistry.waitForDeployment();

  const registryAddress = await baseRegistry.getAddress();
  console.log(`✅ CrossChainVerificationRegistry deployed: ${registryAddress}`);
  console.log(`   ✓ Source domain: ${celoConfig.hyperlane.domain} (Celo)`);
  console.log(`   ✓ Scope: ${scope}`);

  // Wait for contract to propagate
  await sleep(5000);

  // Add Celo registry as trusted sender if we have it
  if (celoRegistry) {
    console.log(`   🔐 Adding Celo registry as trusted sender...`);
    const addTx = await baseRegistry.addTrustedSender(celoRegistry);
    await addTx.wait(2); // Wait for 2 confirmations
    console.log(`   ✓ Trusted sender added: ${celoRegistry}`);

    // Small delay to ensure nonce sync
    await sleep(2000);

    // Enable enforcement
    console.log(`   🔒 Enabling trusted sender enforcement...`);
    const enforceTx = await baseRegistry.setTrustedSenderEnforcement(true);
    await enforceTx.wait(2); // Wait for 2 confirmations
    console.log(`   ✓ Enforcement enabled`);

    // Small delay before next deployment
    await sleep(2000);
  } else {
    console.warn(
      `   ⚠️  Skipping trusted sender setup. Add manually after deployment.`,
    );
  }

  // ===== 2. Deploy SelfVerifiedMultiSend =====
  console.log("\n📝 [2/3] Deploying SelfVerifiedMultiSend...");

  const MultiSend = await ethers.getContractFactory("SelfVerifiedMultiSend");
  const multiSend = await MultiSend.deploy(registryAddress);
  await multiSend.waitForDeployment();

  const multiSendAddress = await multiSend.getAddress();
  console.log(`✅ SelfVerifiedMultiSend deployed: ${multiSendAddress}`);
  console.log(`   ✓ Connected to registry: ${registryAddress}`);

  // Small delay before next deployment
  await sleep(2000);

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
  console.log("🎉 Base Sepolia Deployment Complete!");
  console.log("=".repeat(60));
  console.log(`\n📋 Deployed Contracts:`);
  console.log(`   CrossChainVerificationRegistry: ${registryAddress}`);
  console.log(`   SelfVerifiedMultiSend:          ${multiSendAddress}`);
  console.log(`   SelfVerifiedAirdrop:            ${airdropAddress}`);

  console.log(`\n🔗 Block Explorer URLs:`);
  console.log(
    `   Registry:  https://sepolia.basescan.org/address/${registryAddress}`,
  );
  console.log(
    `   MultiSend: https://sepolia.basescan.org/address/${multiSendAddress}`,
  );
  console.log(
    `   Airdrop:   https://sepolia.basescan.org/address/${airdropAddress}`,
  );

  if (celoRegistry) {
    console.log(`\n🔐 Trusted Sender Configuration:`);
    console.log(`   Celo Registry: ${celoRegistry}`);
    console.log(`   Status: ✅ Added and enforced`);
    console.log(
      `   Verify: baseRegistry.isTrustedSender("${celoRegistry}") should return true`,
    );
  }

  console.log(`\n📝 Next Steps:`);
  console.log(`   1. Verify contracts on Basescan (optional)`);
  if (!celoRegistry) {
    console.log(
      `   2. Add Celo registry as trusted sender: baseRegistry.addTrustedSender(celoRegistryAddress)`,
    );
    console.log(
      `   3. Enable enforcement: baseRegistry.setTrustedSenderEnforcement(true)`,
    );
  }
  console.log(
    `   ${celoRegistry ? "2" : "4"}. Test verification on Celo with Self.xyz app`,
  );
  console.log(
    `   ${celoRegistry ? "3" : "5"}. Relay verification to Base: npx hardhat run scripts/multichain/relay-verification.ts`,
  );
  console.log(
    `   ${celoRegistry ? "4" : "6"}. Test MultiSend/Airdrop on Base!`,
  );

  // Save addresses
  saveDeployedAddresses("baseSepolia", {
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
