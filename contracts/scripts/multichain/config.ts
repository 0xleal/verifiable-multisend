/**
 * Multi-chain deployment configuration
 * Contains network-specific addresses and constants
 */

export interface NetworkConfig {
  name: string;
  chainId: number;
  hyperlane: {
    mailbox: string;
    domain: number;
  };
  selfxyz: {
    hubV2?: string; // Only on Celo
  };
  rpcUrl: string;
}

/**
 * Network configurations for deployment
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  // Celo Sepolia (Source chain with Self.xyz Hub)
  celoSepolia: {
    name: "Celo Sepolia",
    chainId: 11142220, // Celo Sepolia chain ID
    hyperlane: {
      mailbox: "0xD0680F80F4f947968206806C2598Cbc5b6FE5b03", // Hyperlane Mailbox on Celo Sepolia
      domain: 11155420, // Hyperlane domain ID for Celo Sepolia
    },
    selfxyz: {
      hubV2: "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74", // Self.xyz IdentityVerificationHub on Celo Sepolia
    },
    rpcUrl:
      process.env.CELO_SEPOLIA_RPC ||
      "https://alfajores-forno.celo-testnet.org",
  },

  // Base Sepolia (Destination chain)
  baseSepolia: {
    name: "Base Sepolia",
    chainId: 84532,
    hyperlane: {
      mailbox: "0x6966b0E55883d49BFB24539356a2f8A673E02039", // Hyperlane Mailbox on Base Sepolia
      domain: 84532, // Hyperlane domain ID for Base Sepolia
    },
    selfxyz: {
      // No Self.xyz Hub on Base - verification comes from Celo
    },
    rpcUrl: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
  },
};

/**
 * Verification scope seed for all deployments
 * This MUST match across all chains for consistency
 */
export const VERIFICATION_SCOPE_SEED = "humanpay-multichain";

/**
 * Self.xyz verification config ID
 * Config registered via tools.self.xyz: 18+, OFAC Basic, no country restrictions
 * This enforces age verification (18+) and basic OFAC screening
 * Generate custom configs at: https://tools.self.xyz
 */
export const VERIFICATION_CONFIG_ID =
  "0x32332b93ed35ffa75a313b4b2f3e096490739747c872307590d30cf7e936483a"; // Age 18+, OFAC Basic

/**
 * Gas limits for deployment transactions
 */
export const GAS_LIMITS = {
  deployCeloRegistry: 2_000_000,
  deployBaseRegistry: 1_500_000,
  deployMultiSend: 800_000,
  deployAirdrop: 1_500_000,
  relayVerification: 200_000,
};

/**
 * Get network config by name
 */
export function getNetworkConfig(networkName: string): NetworkConfig {
  const config = NETWORKS[networkName];
  if (!config) {
    throw new Error(
      `Network ${networkName} not found. Available: ${Object.keys(NETWORKS).join(", ")}`,
    );
  }
  return config;
}

/**
 * Validate that required environment variables are set
 */
export function validateEnvironment() {
  const required = ["PRIVATE_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please set them in your .env file",
    );
  }
}

/**
 * Helper to get deployed contract addresses
 * These will be saved after deployment
 */
export interface DeployedContracts {
  celoSepolia?: {
    registry: string;
    multiSend: string;
    airdrop: string;
  };
  baseSepolia?: {
    registry: string;
    multiSend: string;
    airdrop: string;
  };
}

/**
 * Save deployed addresses to a JSON file
 */
export function saveDeployedAddresses(
  network: string,
  addresses: { registry: string; multiSend: string; airdrop: string },
) {
  const fs = require("fs");
  const path = require("path");
  const filePath = path.join(__dirname, "deployed-addresses.json");

  let data: DeployedContracts = {};
  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  data[network as keyof DeployedContracts] = addresses;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`\n✅ Addresses saved to ${filePath}`);
}

/**
 * Load deployed addresses from JSON file
 */
export function loadDeployedAddresses(): DeployedContracts {
  const fs = require("fs");
  const path = require("path");
  const filePath = path.join(__dirname, "deployed-addresses.json");

  if (!fs.existsSync(filePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
