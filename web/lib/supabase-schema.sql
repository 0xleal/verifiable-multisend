-- Supabase SQL Schema for Airdrops
-- Run this in your Supabase SQL Editor

-- Drop existing table and policies if updating
DROP TABLE IF EXISTS airdrops CASCADE;

-- Create airdrops table (NO RLS - we handle security in API routes)
CREATE TABLE airdrops (
  id TEXT PRIMARY KEY,                    -- Unique identifier (e.g., "talent-q1-2025")
  airdrop_id_hash TEXT NOT NULL UNIQUE,   -- keccak256 hash for onchain lookup (must be unique)
  recipients JSONB NOT NULL,              -- Array of recipient objects with address, amount, index, proof
  merkle_root TEXT NOT NULL,              -- Merkle root hash
  token_address TEXT NOT NULL,            -- ERC20 address or "0x0" for native token
  total_amount TEXT NOT NULL,             -- Total airdrop amount as string (to handle big numbers)
  creator TEXT NOT NULL,                  -- Address of airdrop creator (lowercase)
  tx_hash TEXT NOT NULL,                  -- Transaction hash - NOT NULL because we only store after successful deployment
  block_number BIGINT,                    -- Block number for verification
  network TEXT NOT NULL DEFAULT 'celo-sepolia', -- Network where contract is deployed
  created_at TIMESTAMPTZ DEFAULT NOW()    -- Auto-managed timestamp
);

-- Add indexes for performance
CREATE INDEX idx_airdrops_airdrop_id_hash ON airdrops(airdrop_id_hash);
CREATE INDEX idx_airdrops_creator ON airdrops(creator);
CREATE INDEX idx_airdrops_created_at ON airdrops(created_at DESC);
CREATE INDEX idx_airdrops_tx_hash ON airdrops(tx_hash);

-- NO RLS POLICIES
-- Security is handled in API routes using service role key
-- This prevents client-side database access

-- Add comments
COMMENT ON TABLE airdrops IS 'Stores merkle tree data for token airdrops. Write-only through API, read-only for claim verification.';
COMMENT ON COLUMN airdrops.tx_hash IS 'Required - proves airdrop was actually deployed onchain';
COMMENT ON COLUMN airdrops.airdrop_id_hash IS 'Must be unique - prevents duplicate airdrops';
