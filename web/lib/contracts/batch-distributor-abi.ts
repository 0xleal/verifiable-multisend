export const BATCH_DISTRIBUTOR_ABI = [
  {
    inputs: [
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    name: "distributeEther",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "token", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    name: "distributeToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

// Example deployed contract addresses (you would deploy your own)
export const BATCH_DISTRIBUTOR_ADDRESSES = {
  1: "0x0000000000000000000000000000000000000000", // Mainnet
  11155111: "0x0000000000000000000000000000000000000000", // Sepolia
  8453: "0x0000000000000000000000000000000000000000", // Base
  84532: "0x0000000000000000000000000000000000000000", // Base Sepolia
} as const
