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
      "0xEe6A46D2E961021db4852adde243c28DA1bD53f1".toLowerCase() as `0x${string}`,
    verificationRegistryAbi: CeloVerificationRegistryAbi,
    distributionContractAddress:
      "0x5A9cC776EEB1DD7661a2a048a1c50Da6315f4b92".toLowerCase() as `0x${string}`,
    distributionContractAbi: SelfVerifiedMultiSendAbi,
    airdropContractAddress:
      "0x09fA00cAA728f873D76675fE4AdEB90427c767CF".toLowerCase() as `0x${string}`,
    canVerifyDirectly: true,
    scopeSeed: "humanpay-multichain",
    selfEndpointType: "staging_celo",
  },
  [baseSepolia.id]: {
    chain: baseSepolia,
    verificationRegistryAddress:
      "0x73336E60E2D49Fa8485FA6C9E22fB27a1F7bad8d".toLowerCase() as `0x${string}`,
    verificationRegistryAbi: CrossChainVerificationRegistryAbi,
    distributionContractAddress:
      "0xA12EDFa6B98897c47C4Ff74bCD2fd186DFa97BF6".toLowerCase() as `0x${string}`,
    distributionContractAbi: SelfVerifiedMultiSendAbi,
    airdropContractAddress:
      "0xB68adc32810e99bfEc240a6dFD66c3cA90668028".toLowerCase() as `0x${string}`,
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
