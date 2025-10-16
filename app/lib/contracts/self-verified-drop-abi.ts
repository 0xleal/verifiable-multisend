export const SelfVerifiedDropAbi = [
  {
    type: "function",
    name: "getScope",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "verificationExpiresAt",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isSenderVerified",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "verifySelfProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proofPayload", type: "bytes" },
      { name: "userData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "airdropETH",
    stateMutability: "payable",
    inputs: [
      { name: "_addresses", type: "address[]" },
      { name: "_amounts", type: "uint256[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "airdropERC20",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_token", type: "address" },
      { name: "_addresses", type: "address[]" },
      { name: "_amounts", type: "uint256[]" },
      { name: "_totalAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setConfigId",
    stateMutability: "nonpayable",
    inputs: [{ name: "configId", type: "bytes32" }],
    outputs: [],
  },
];
