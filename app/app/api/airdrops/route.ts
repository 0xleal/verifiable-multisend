import { NextRequest, NextResponse } from "next/server";
import { AirdropStorage, type AirdropData } from "@/lib/airdrop-storage";

/**
 * POST /api/airdrops
 * Create a new airdrop data entry
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
      !data.creator
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

    // Store the airdrop data
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
