import { NextRequest, NextResponse } from "next/server";
import { AirdropStorage } from "@/lib/airdrop-storage";

/**
 * GET /api/airdrops/[id]
 * Retrieve airdrop data by identifier
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const airdrop = await AirdropStorage.get(id);

    if (!airdrop) {
      return NextResponse.json(
        { error: "Airdrop not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(airdrop, { status: 200 });
  } catch (error) {
    console.error("Error fetching airdrop:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
