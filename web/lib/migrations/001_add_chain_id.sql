-- Migration: Add chain_id column for multi-chain support
-- Date: 2025
-- Description: Adds chain_id to track which blockchain the airdrop is deployed on

-- Step 1: Add chain_id column with default value (Celo Sepolia)
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS chain_id INTEGER NOT NULL DEFAULT 11142220;

-- Step 2: Update existing rows based on network column
-- This ensures existing airdrops get the correct chain_id
UPDATE airdrops SET chain_id = 11142220 WHERE network = 'celo-sepolia' OR network LIKE '%celo%';
UPDATE airdrops SET chain_id = 84532 WHERE network = 'base-sepolia' OR network LIKE '%base%';

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_airdrops_chain_id ON airdrops(chain_id);

-- Step 4: Add column comment
COMMENT ON COLUMN airdrops.chain_id IS 'Chain ID where the airdrop contract is deployed (e.g., 11142220 for Celo Sepolia, 84532 for Base Sepolia)';

-- Verify migration
SELECT
  id,
  network,
  chain_id,
  CASE
    WHEN chain_id = 11142220 THEN 'Celo Sepolia'
    WHEN chain_id = 84532 THEN 'Base Sepolia'
    ELSE 'Unknown'
  END as chain_name
FROM airdrops
ORDER BY created_at DESC
LIMIT 10;
