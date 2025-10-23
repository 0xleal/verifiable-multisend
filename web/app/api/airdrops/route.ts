import { NextRequest, NextResponse } from "next/server";
import { AirdropStorage, type AirdropData } from "@/lib/airdrop-storage";
import { createPublicClient, http, parseEventLogs } from "viem";
import { celoSepolia } from "viem/chains";
import { SelfVerifiedAirdropAbi } from "@/lib/contracts/self-verified-airdrop-abi";

// Environment variables
const RPC_URL =
  process.env.CELO_SEPOLIA_RPC_URL ||
  "https://alfajores-forno.celo-testnet.org";
const AIRDROP_CONTRACT_ADDRESS = (process.env
  .NEXT_PUBLIC_AIRDROP_CONTRACT_ADDRESS ||
  "0x7c2a63e1713578d4d704b462c2dee311a59ae304") as `0x${string}`;

// Viem public client for onchain verification
const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(RPC_URL),
});

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
      !data.txHash
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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
      const onchainAirdrop = (await publicClient.readContract({
        address: AIRDROP_CONTRACT_ADDRESS,
        abi: SelfVerifiedAirdropAbi,
        functionName: "airdrops",
        args: [data.airdropIdHash as `0x${string}`],
      })) as any;

      if (
        !onchainAirdrop ||
        onchainAirdrop.merkleRoot ===
          "0x0000000000000000000000000000000000000000000000000000000000000000"
      ) {
        return NextResponse.json(
          { error: "Airdrop not found onchain" },
          { status: 400 }
        );
      }

      // 6. Verify merkle root matches
      if (
        onchainAirdrop.merkleRoot.toLowerCase() !==
        data.merkleRoot.toLowerCase()
      ) {
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
