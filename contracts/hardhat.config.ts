import * as dotenv from "dotenv";
dotenv.config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";

const CELO_SEPOLIA_RPC =
  process.env.CELO_SEPOLIA_RPC || "https://forno.celo-testnet.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: "USD",
    // Set token for price conversion (requires CMC API key below)
    token: "CELO",
    etherscan: process.env.ETHERSCAN_API_KEY || "",
    coinmarketcap: process.env.CMC_API_KEY || undefined,
  },
  networks: {
    celo_sepolia: {
      chainId: 11142220,
      url: CELO_SEPOLIA_RPC,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
    customChains: [
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io",
        },
      },
      {
        network: "celo_sepolia",
        chainId: 11142220,
        urls: {
          apiURL: "https://api-sepolia.celoscan.io/api",
          browserURL: "https://sepolia.celoscan.io",
        },
      },
    ],
  },
};

export default config;
