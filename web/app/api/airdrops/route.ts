import { NextRequest, NextResponse } from "next/server";
import { AirdropStorage, type AirdropData } from "@/lib/airdrop-storage";
import {
  createPublicClient,
  http,
  parseEventLogs,
  type PublicClient,
} from "viem";
import { celoSepolia, baseSepolia } from "viem/chains";
import { SelfVerifiedAirdropAbi } from "@/lib/contracts/self-verified-airdrop-abi";
import { getChainConfig } from "@/lib/chain-config";

// Multi-chain configuration
const CHAIN_CONFIGS = {
  [celoSepolia.id]: {
    chain: celoSepolia,
    rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
  },
  [baseSepolia.id]: {
    chain: baseSepolia,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
  },
} as const;

// Get public client for specific chain
function getPublicClient(chainId: number) {
  const config = CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS];

  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

/**
 * POST /api/airdrops
 * Create a new airdrop data entry with onchain verification
 */
export async function POST(request: NextRequest) {
  try {
    const data: AirdropData = await request.json();

    // Validate required fields
    if (
      !data.id ||
      !data.airdropIdHash ||
      !data.recipients ||
      !data.merkleRoot ||
      !data.creator ||
      !data.txHash ||
      !data.chainId
    ) {
      return NextResponse.json(
        { error: "Missing required fields (including chainId)" },
        { status: 400 }
      );
    }

    // Get chain-specific config
    const chainConfig = getChainConfig(data.chainId);
    if (!chainConfig) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${data.chainId}` },
        { status: 400 }
      );
    }

    const airdropContractAddress = chainConfig.airdropContractAddress;
    const publicClient = getPublicClient(data.chainId);

    // Check if airdrop already exists
    const exists = await AirdropStorage.exists(data.id);
    if (exists) {
      return NextResponse.json(
        { error: "Airdrop with this ID already exists" },
        { status: 409 }
      );
    }

    // ====================================================
    // CRITICAL: Verify transaction exists onchain
    // ====================================================

    try {
      // 1. Fetch transaction receipt
      const receipt = await publicClient.getTransactionReceipt({
        hash: data.txHash as `0x${string}`,
      });

      if (!receipt) {
        return NextResponse.json(
          { error: "Transaction not found onchain" },
          { status: 400 }
        );
      }

      // 2. Parse AirdropCreated event from logs
      const logs = parseEventLogs({
        abi: SelfVerifiedAirdropAbi,
        eventName: "AirdropCreated",
        logs: receipt.logs,
      });

      // 3. Find the matching AirdropCreated event
      const airdropEvent = logs.find(
        (log) => log.args.airdropId === data.airdropIdHash
      );

      if (!airdropEvent) {
        return NextResponse.json(
          {
            error: "Transaction does not contain matching AirdropCreated event",
          },
          { status: 400 }
        );
      }

      // 4. Verify creator matches
      if (
        airdropEvent.args.creator?.toLowerCase() !== data.creator.toLowerCase()
      ) {
        return NextResponse.json(
          { error: "Creator address mismatch" },
          { status: 400 }
        );
      }

      // 5. Read airdrop from contract to verify merkle root
      const onchainAirdropResult = await publicClient.readContract({
        address: airdropContractAddress,
        abi: SelfVerifiedAirdropAbi,
        functionName: "airdrops",
        args: [data.airdropIdHash as `0x${string}`],
      });

      // Destructure the tuple returned by the contract
      // struct Airdrop { merkleRoot, tokenAddress, totalAmount, claimedAmount, creator, cancelled }
      const [
        onchainMerkleRoot,
        onchainTokenAddress,
        onchainTotalAmount,
        onchainClaimedAmount,
        onchainCreator,
        onchainCancelled,
      ] = onchainAirdropResult as readonly [
        string,
        string,
        bigint,
        bigint,
        string,
        boolean,
      ];

      // Check if airdrop exists (merkleRoot is zero if not found)
      if (
        !onchainMerkleRoot ||
        onchainMerkleRoot ===
          "0x0000000000000000000000000000000000000000000000000000000000000000"
      ) {
        return NextResponse.json(
          { error: "Airdrop not found onchain" },
          { status: 400 }
        );
      }

      // 6. Verify merkle root matches
      if (onchainMerkleRoot.toLowerCase() !== data.merkleRoot.toLowerCase()) {
        return NextResponse.json(
          {
            error:
              "Merkle root mismatch between submitted data and onchain data",
          },
          { status: 400 }
        );
      }

      // 7. Add block number from receipt
      data.blockNumber = Number(receipt.blockNumber);
    } catch (verificationError: any) {
      console.error("Onchain verification failed:", verificationError);
      return NextResponse.json(
        { error: `Onchain verification failed: ${verificationError.message}` },
        { status: 400 }
      );
    }

    // All verification passed - store the airdrop data
    await AirdropStorage.set(data.id, data);

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating airdrop:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
