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
      "0x9f0eA3fc541415BaacED50dacb06FFdc7ADced72".toLowerCase() as `0x${string}`,
    verificationRegistryAbi: CeloVerificationRegistryAbi,
    distributionContractAddress:
      "0x5787B4FDcb1437Cc6fcEFAb845924E1697ed5fE2".toLowerCase() as `0x${string}`,
    distributionContractAbi: SelfVerifiedMultiSendAbi,
    airdropContractAddress:
      "0x120e3798B2284f875659813101BB984D56c36022".toLowerCase() as `0x${string}`,
    canVerifyDirectly: true,
    scopeSeed: "humanpay-multichain",
    selfEndpointType: "staging_celo",
  },
  [baseSepolia.id]: {
    chain: baseSepolia,
    verificationRegistryAddress:
      "0x1b0e6584Caf81f1cBca7Fb390192aAa192074C4d".toLowerCase() as `0x${string}`,
    verificationRegistryAbi: CrossChainVerificationRegistryAbi,
    distributionContractAddress:
      "0xF6368F4464f6D571aa1C061D5279b52F5FC79BE0".toLowerCase() as `0x${string}`,
    distributionContractAbi: SelfVerifiedMultiSendAbi,
    airdropContractAddress:
      "0x0F6086351cbC9caF0b74d985a2876A6F14b08A70".toLowerCase() as `0x${string}`,
    canVerifyDirectly: false, // Base receives verifications via Hyperlane
    scopeSeed: "humanpay-multichain",
    selfEndpointType: "staging_celo", // Verification always happens on Celo
  },
};

export const SUPPORTED_CHAINS = Object.values(CHAIN_CONFIGS).map(
  (config) => config.chain
);

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

export function getVerificationChainConfig(): ChainConfig {
  // Always use Celo for Self verification
  return CHAIN_CONFIGS[celoSepolia.id];
}

export function getNativeCurrencySymbol(chainId: number): string {
  const config = getChainConfig(chainId);
  return config?.chain.nativeCurrency?.symbol || "ETH";
}
