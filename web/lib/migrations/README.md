# Database Migrations

This folder contains SQL migration scripts for the Supabase database.

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Open the migration file (e.g., `001_add_chain_id.sql`)
4. Copy and paste the SQL into the editor
5. Click **Run**
6. Verify the results in the output

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

## Available Migrations

### 001_add_chain_id.sql

**Purpose**: Adds multi-chain support by adding `chain_id` column to the `airdrops` table.

**When to run**: After upgrading to multi-chain support (Base Sepolia + Celo Sepolia)

**What it does**:
- Adds `chain_id INTEGER NOT NULL DEFAULT 11142220` column
- Updates existing Celo airdrops to `chain_id = 11142220`
- Updates existing Base airdrops to `chain_id = 84532`
- Adds index for performance
- Includes verification query

**Safe to run**: Yes - Uses `IF NOT EXISTS` and has default values

## Chain IDs Reference

| Network | Chain ID | Default |
|---------|----------|---------|
| Celo Sepolia | 11142220 | ✅ |
| Base Sepolia | 84532 | - |

## Rollback

To rollback the chain_id migration:

```sql
-- Remove index
DROP INDEX IF EXISTS idx_airdrops_chain_id;

-- Remove column
ALTER TABLE airdrops DROP COLUMN IF EXISTS chain_id;
```

⚠️ **Warning**: Rolling back will lose chain_id data!
