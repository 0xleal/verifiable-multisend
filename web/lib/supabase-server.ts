/**
 * SERVER-SIDE ONLY Supabase client
 * Uses service role key for bypassing RLS (we don't use RLS anyway)
 *
 * ⚠️ NEVER import this in client components!
 * ⚠️ Only use in API routes and server components
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. This should be the service_role key, NOT the anon key!"
  );
}

// Server-side client with service role key
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database types
export interface AirdropRecipient {
  address: string;
  amount: string;
  index: number;
  proof: string[];
}

export interface AirdropRow {
  id: string; // Primary key - the unique identifier (not hashed)
  airdrop_id_hash: string; // The keccak256 hash used onchain (UNIQUE)
  recipients: AirdropRecipient[]; // JSONB array
  merkle_root: string;
  token_address: string;
  total_amount: string;
  creator: string; // lowercase
  tx_hash: string; // NOT NULL - required
  block_number: number | null;
  network: string;
  created_at: string; // Timestamp managed by Supabase
}
