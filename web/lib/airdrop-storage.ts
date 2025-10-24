/**
 * Supabase-backed storage for airdrop data
 *
 * ⚠️ This uses server-side client - should only be called from API routes
 */

import { supabaseServer, type AirdropRow } from "./supabase-server";

export interface AirdropData {
  id: string; // The unique identifier (not hashed)
  airdropIdHash: string; // The keccak256 hash used onchain
  recipients: Array<{
    address: string;
    amount: string;
    index: number;
    proof: string[];
  }>;
  merkleRoot: string;
  tokenAddress: string;
  totalAmount: string;
  creator: string;
  createdAt: number;
  txHash: string; // Required now
  blockNumber?: number;
  network: string;
  chainId: number; // Chain ID for multi-chain support
}

/**
 * Convert database row to AirdropData format
 */
function rowToAirdropData(row: AirdropRow): AirdropData {
  return {
    id: row.id,
    airdropIdHash: row.airdrop_id_hash,
    recipients: row.recipients,
    merkleRoot: row.merkle_root,
    tokenAddress: row.token_address,
    totalAmount: row.total_amount,
    creator: row.creator.toLowerCase(),
    createdAt: new Date(row.created_at).getTime(),
    txHash: row.tx_hash,
    blockNumber: row.block_number ?? undefined,
    network: row.network,
    chainId: row.chain_id,
  };
}

/**
 * Convert AirdropData to database row format
 */
function airdropDataToRow(data: AirdropData): Omit<AirdropRow, "created_at"> {
  return {
    id: data.id.toLowerCase(),
    airdrop_id_hash: data.airdropIdHash,
    recipients: data.recipients,
    merkle_root: data.merkleRoot,
    token_address: data.tokenAddress || "0x0",
    total_amount: data.totalAmount,
    creator: data.creator.toLowerCase(),
    tx_hash: data.txHash,
    block_number: data.blockNumber ?? null,
    network: data.network,
    chain_id: data.chainId,
  };
}

export const AirdropStorage = {
  /**
   * Store airdrop data in Supabase
   */
  async set(id: string, data: AirdropData): Promise<void> {
    const row = airdropDataToRow(data);

    const { error } = await supabaseServer.from("airdrops").insert(row);

    if (error) {
      console.error("Supabase insert error:", error);

      // Check for duplicate
      if (error.code === "23505") {
        // Unique constraint violation
        throw new Error("Airdrop with this ID already exists");
      }

      throw new Error(`Failed to store airdrop: ${error.message}`);
    }
  },

  /**
   * Retrieve airdrop data by identifier
   */
  async get(id: string): Promise<AirdropData | null> {
    const { data, error } = await supabaseServer
      .from("airdrops")
      .select("*")
      .eq("id", id.toLowerCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      console.error("Supabase select error:", error);
      throw new Error(`Failed to get airdrop: ${error.message}`);
    }

    return data ? rowToAirdropData(data as AirdropRow) : null;
  },

  /**
   * Check if airdrop exists
   */
  async exists(id: string): Promise<boolean> {
    const { count, error } = await supabaseServer
      .from("airdrops")
      .select("id", { count: "exact", head: true })
      .eq("id", id.toLowerCase());

    if (error) {
      console.error("Supabase count error:", error);
      return false;
    }

    return (count ?? 0) > 0;
  },

  /**
   * Delete airdrop data
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabaseServer
      .from("airdrops")
      .delete()
      .eq("id", id.toLowerCase());

    if (error) {
      console.error("Supabase delete error:", error);
      throw new Error(`Failed to delete airdrop: ${error.message}`);
    }
  },

  /**
   * Get all airdrops (for debugging/admin)
   */
  async getAll(): Promise<AirdropData[]> {
    const { data, error } = await supabaseServer
      .from("airdrops")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase select all error:", error);
      throw new Error(`Failed to get all airdrops: ${error.message}`);
    }

    return data ? data.map((row) => rowToAirdropData(row as AirdropRow)) : [];
  },

  /**
   * Get airdrops by creator address
   */
  async getByCreator(creator: string): Promise<AirdropData[]> {
    const { data, error } = await supabaseServer
      .from("airdrops")
      .select("*")
      .eq("creator", creator.toLowerCase())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase select by creator error:", error);
      throw new Error(`Failed to get airdrops by creator: ${error.message}`);
    }

    return data ? data.map((row) => rowToAirdropData(row as AirdropRow)) : [];
  },
};
