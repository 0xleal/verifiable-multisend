import { celoSepolia, baseSepolia } from "wagmi/chains";
import { CeloVerificationRegistryAbi } from "./contracts/celo-verification-registry-abi";
import { CrossChainVerificationRegistryAbi } from "./contracts/cross-chain-verification-registry-abi";
import { SelfVerifiedMultiSendAbi } from "./contracts/self-verified-multisend-abi";

export type SupportedChain = typeof celoSepolia | typeof baseSepolia;

export interface ChainConfig {
  chain: SupportedChain;
  verificationRegistryAddress: `0x${string}`;
  verificationRegistryAbi: typeof CeloVerificationRegistryAbi | typeof CrossChainVerificationRegistryAbi;
  distributionContractAddress: `0x${string}`; // SelfVerifiedMultiSend contract for this chain
  distributionContractAbi: typeof SelfVerifiedMultiSendAbi;
  airdropContractAddress: `0x${string}`; // SelfVerifiedAirdrop contract for claim mode
  canVerifyDirectly: boolean; // Can verify Self proofs on this chain
  scopeSeed: string;
  selfEndpointType: "staging_celo" | "staging_base";
}

// Contract addresses for each chain
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  [celoSepolia.id]: {
    chain: celoSepolia,
    verificationRegistryAddress: "0xC2FE5379a4c096e097d47f760855B85edDF625e2".toLowerCase() as `0x${string}`,
    verificationRegistryAbi: CeloVerificationRegistryAbi,
    distributionContractAddress: "0xC2FE5379a4c096e097d47f760855B85edDF625e2".toLowerCase() as `0x${string}`, // TODO: Update with actual SelfVerifiedMultiSend address
    distributionContractAbi: SelfVerifiedMultiSendAbi,
    airdropContractAddress: "0x7c2a63e1713578d4d704b462c2dee311a59ae304".toLowerCase() as `0x${string}`, // TODO: Update with actual SelfVerifiedAirdrop address
    canVerifyDirectly: true,
    scopeSeed: "self-backed-sender",
    selfEndpointType: "staging_celo",
  },
  [baseSepolia.id]: {
    chain: baseSepolia,
    verificationRegistryAddress: "0x0000000000000000000000000000000000000000".toLowerCase() as `0x${string}`, // TODO: Update with actual Base Sepolia verification registry address
    verificationRegistryAbi: CrossChainVerificationRegistryAbi,
    distributionContractAddress: "0x0000000000000000000000000000000000000000".toLowerCase() as `0x${string}`, // TODO: Update with actual Base Sepolia distribution contract address
    distributionContractAbi: SelfVerifiedMultiSendAbi,
    airdropContractAddress: "0x0000000000000000000000000000000000000000".toLowerCase() as `0x${string}`, // TODO: Update with actual Base Sepolia airdrop contract address
    canVerifyDirectly: false, // Base receives verifications via Hyperlane
    scopeSeed: "self-backed-sender",
    selfEndpointType: "staging_celo", // Always verify on Celo
  },
};

export const SUPPORTED_CHAINS = Object.values(CHAIN_CONFIGS).map(config => config.chain);

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

export function getVerificationChainConfig(): ChainConfig {
  // Always use Celo for Self verification
  return CHAIN_CONFIGS[celoSepolia.id];
}
