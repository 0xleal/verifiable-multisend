import { celoSepolia, baseSepolia } from "wagmi/chains";
import { CeloVerificationRegistryAbi } from "./contracts/celo-verification-registry-abi";
import { CrossChainVerificationRegistryAbi } from "./contracts/cross-chain-verification-registry-abi";
import { SelfVerifiedMultiSendAbi } from "./contracts/self-verified-multisend-abi";

export type SupportedChain = typeof celoSepolia | typeof baseSepolia;

export interface ChainConfig {
  chain: SupportedChain;
  verificationRegistryAddress: `0x${string}`;
  verificationRegistryAbi:
    | typeof CeloVerificationRegistryAbi
    | typeof CrossChainVerificationRegistryAbi;
  distributionContractAddress: `0x${string}`; // SelfVerifiedMultiSend contract for this chain
  distributionContractAbi: typeof SelfVerifiedMultiSendAbi;
  airdropContractAddress: `0x${string}`; // SelfVerifiedAirdrop contract for claim mode
  canVerifyDirectly: boolean; // Can verify Self proofs on this chain
  scopeSeed: string;
  selfEndpointType: "staging_celo"; // Always verify on Celo
}

// Contract addresses for each chain
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  [celoSepolia.id]: {
    chain: celoSepolia,
    verificationRegistryAddress:
      "0x8358A0aA8b6D13DA961192b2eF59e01CfE910611".toLowerCase() as `0x${string}`,
    verificationRegistryAbi: CeloVerificationRegistryAbi,
    distributionContractAddress:
      "0x8BeC142e20177bA1c2D88A800919bd62CbeAb78c".toLowerCase() as `0x${string}`,
    distributionContractAbi: SelfVerifiedMultiSendAbi,
    airdropContractAddress:
      "0xFcAaD270954B9c841f5f622EBD3E016cAeCdc905".toLowerCase() as `0x${string}`,
    canVerifyDirectly: true,
    scopeSeed: "humanpay-multichain",
    selfEndpointType: "staging_celo",
  },
  [baseSepolia.id]: {
    chain: baseSepolia,
    verificationRegistryAddress:
      "0xd05f92110e3cF70944f8cF2D441850c2426D4A1C".toLowerCase() as `0x${string}`,
    verificationRegistryAbi: CrossChainVerificationRegistryAbi,
    distributionContractAddress:
      "0x3dff401b75C18E3A11fAa352D0414Bba545ae44a".toLowerCase() as `0x${string}`,
    distributionContractAbi: SelfVerifiedMultiSendAbi,
    airdropContractAddress:
      "0xEdc5Ca6Ac5033A4AbcB39b01D236CE1b0216E620".toLowerCase() as `0x${string}`,
    canVerifyDirectly: false, // Base receives verifications via Hyperlane
    scopeSeed: "humanpay-multichain",
    selfEndpointType: "staging_celo", // Verification always happens on Celo
  },
};

export const SUPPORTED_CHAINS = Object.values(CHAIN_CONFIGS).map(
  (config) => config.chain,
);

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

export function getVerificationChainConfig(): ChainConfig {
  // Always use Celo for Self verification
  return CHAIN_CONFIGS[celoSepolia.id];
}
