import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create a client even if env vars are missing (for build time)
// Runtime checks will happen in the actual functions
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

export function checkSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file. See SUPABASE_SETUP.md for instructions."
    );
  }
}

// Database types
export interface AirdropRecipient {
  address: string;
  amount: string;
  index: number;
  proof: string[];
}

export interface AirdropRow {
  id: string; // Primary key - the unique identifier (not hashed)
  airdrop_id_hash: string; // The keccak256 hash used onchain
  recipients: AirdropRecipient[]; // JSONB array
  merkle_root: string;
  token_address: string;
  total_amount: string;
  creator: string;
  tx_hash?: string;
  created_at: string; // Timestamp managed by Supabase
}
