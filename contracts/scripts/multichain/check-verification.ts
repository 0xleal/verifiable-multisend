import { ethers } from "hardhat";
import { loadDeployedAddresses } from "./config";

/**
 * Check verification status on either Celo or Base
 *
 * Usage:
 *   # Check on Celo
 *   npx hardhat run scripts/multichain/check-verification.ts --network celo_sepolia
 *
 *   # Check on Base
 *   npx hardhat run scripts/multichain/check-verification.ts --network base_sepolia
 *
 *   # Check specific user
 *   USER_ADDRESS=0x123... npx hardhat run scripts/multichain/check-verification.ts --network base_sepolia
 */
async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === BigInt(11142220) ? "celoSepolia" : "baseSepolia";

  console.log(`\n🔍 Checking verification status on ${networkName}...\n`);

  // Load deployed addresses
  const deployedAddresses = loadDeployedAddresses();
  const registryAddress = deployedAddresses[networkName]?.registry;

  if (!registryAddress) {
    throw new Error(
      `❌ Registry not found for ${networkName}. Deploy contracts first.`
    );
  }

  console.log(`📋 Registry: ${registryAddress}`);

  // Get user address
  const [deployer] = await ethers.getSigners();
  const userAddress = process.env.USER_ADDRESS || deployer.address;

  console.log(`👤 Checking: ${userAddress}\n`);

  // Connect to registry (works for both types)
  const registry = await ethers.getContractAt(
    "IVerificationRegistry",
    registryAddress
  );

  // Check status
  const isVerified = await registry.isVerified(userAddress);
  const expiresAt = await registry.verificationExpiresAt(userAddress);
  const scope = await registry.getScope();

  console.log("=".repeat(60));
  console.log(`Verification Status`);
  console.log("=".repeat(60));

  if (isVerified) {
    console.log(`✅ Status: VERIFIED`);
    console.log(`⏰ Expires: ${new Date(Number(expiresAt) * 1000).toISOString()}`);

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = Number(expiresAt) - now;
    const daysUntilExpiry = Math.floor(timeUntilExpiry / 86400);
    const hoursRemaining = Math.floor((timeUntilExpiry % 86400) / 3600);

    console.log(`📅 Time remaining: ${daysUntilExpiry} days, ${hoursRemaining} hours`);
  } else {
    console.log(`❌ Status: NOT VERIFIED`);

    if (expiresAt > 0n) {
      const now = Math.floor(Date.now() / 1000);
      if (Number(expiresAt) < now) {
        console.log(`⏰ Last verified: ${new Date(Number(expiresAt) * 1000).toISOString()}`);
        console.log(`⚠️  Verification EXPIRED`);
      }
    } else {
      console.log(`📝 User has never been verified on this chain`);
    }
  }

  console.log(`\n📊 Scope: ${scope}`);
  console.log("=".repeat(60));

  if (!isVerified && networkName === "baseSepolia") {
    console.log(`\n💡 To get verified on Base:`);
    console.log(`   1. Verify on Celo first (if not already done)`);
    console.log(`   2. Run: npx hardhat run scripts/multichain/relay-verification.ts --network celo_sepolia`);
    console.log(`   3. Wait 1-5 minutes for Hyperlane delivery`);
    console.log(`   4. Run this script again to confirm\n`);
  } else if (!isVerified && networkName === "celoSepolia") {
    console.log(`\n💡 To get verified on Celo:`);
    console.log(`   1. Open Self.xyz mobile app`);
    console.log(`   2. Scan your NFC passport`);
    console.log(`   3. Submit proof to registry: ${registryAddress}`);
    console.log(`   4. Run this script again to confirm\n`);
  } else if (isVerified) {
    console.log(`\n✨ You're all set! You can now use:`);
    console.log(`   • MultiSend: ${deployedAddresses[networkName]?.multiSend}`);
    console.log(`   • Airdrop: ${deployedAddresses[networkName]?.airdrop}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });
