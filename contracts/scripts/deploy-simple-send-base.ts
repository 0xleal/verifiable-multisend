import * as dotenv from "dotenv";
dotenv.config();

import { ethers, network } from "hardhat";

async function main() {
  // Validate network
  const validNetworks = ["base", "base_sepolia"];
  if (!validNetworks.includes(network.name)) {
    console.warn(
      `Warning: This script is intended for Base networks (base, base_sepolia). Current network: ${network.name}`
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying SimpleSend contract...");
  console.log("Network:", network.name);
  console.log("Deployer address:", deployer.address);
  console.log(
    "Deployer balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // Deploy SimpleSend contract
  const SimpleSendFactory = await ethers.getContractFactory("SimpleSend");
  console.log("Deploying contract...");

  const simpleSend = await SimpleSendFactory.deploy();
  await simpleSend.waitForDeployment();

  const contractAddress = await simpleSend.getAddress();
  console.log("SimpleSend deployed to:", contractAddress);

  // Log deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", network.name);
  console.log("Contract:", "SimpleSend");
  console.log("Address:", contractAddress);
  console.log("Deployer:", deployer.address);

  if (process.env.BASESCAN_API_KEY) {
    console.log("\nTo verify the contract, run:");
    console.log(
      `npx hardhat verify --network ${network.name} ${contractAddress}`
    );
  } else {
    console.log("\nNote: Set BASESCAN_API_KEY in .env to enable contract verification");
  }

  /*
   Usage:
   - The SimpleSend contract provides gas-optimized bulk transfer functions
   - No constructor arguments required
   - Functions available:
     1. airdropERC20(token, addresses, amounts, totalAmount) - Bulk ERC20 transfers
     2. airdropETH(addresses, amounts) - Bulk ETH transfers

   Example usage (after deployment):
   - For ERC20: First approve the contract to spend your tokens, then call airdropERC20
   - For ETH: Call airdropETH with msg.value equal to total amount being distributed
  */
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
