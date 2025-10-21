# Supabase Setup Instructions

This guide will help you set up Supabase for the airdrop claim feature.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: verifiable-multisend (or your preferred name)
   - **Database Password**: Generate a strong password (save it securely)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be provisioned (~2 minutes)

## 2. Run the Database Schema

1. In your Supabase project, go to the **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `lib/supabase-schema.sql`
4. Paste into the SQL Editor
5. Click "Run" or press `Cmd/Ctrl + Enter`
6. You should see "Success. No rows returned" - this is expected!

## 3. Get Your API Keys

1. Go to **Project Settings** (gear icon in left sidebar)
2. Click **API** in the settings menu
3. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: `eyJhbG...` (long string)

## 4. Configure Environment Variables

1. Create a `.env.local` file in the `app` directory:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   ```

3. Restart your development server if it's running

## 5. Verify the Setup

1. Start your app: `npm run dev`
2. Go through the airdrop creation flow
3. After creating an airdrop, check your Supabase dashboard:
   - Go to **Table Editor** → **airdrops**
   - You should see your airdrop data stored there

## Database Schema Overview

The `airdrops` table stores:
- `id`: Unique identifier (e.g., "talent-q1-2025")
- `airdrop_id_hash`: keccak256 hash for onchain lookup
- `recipients`: JSONB array with merkle tree data
- `merkle_root`: Merkle root hash
- `token_address`: ERC20 address or "0x0" for ETH
- `total_amount`: Total airdrop amount
- `creator`: Creator's wallet address
- `tx_hash`: Deployment transaction hash
- `created_at`: Auto-managed timestamp

## Row Level Security (RLS)

The schema includes RLS policies:
- ✅ **Public read**: Anyone can view airdrops (needed for claim page)
- ✅ **Public insert**: Anyone can create airdrops
- ⚠️ **Update/Delete**: Only creators can modify their own airdrops

## Additional Features

The storage layer includes:
- `AirdropStorage.getByCreator(address)`: Get all airdrops by a creator
- `AirdropStorage.getAll()`: Get all airdrops (admin/debugging)
- Automatic lowercase normalization for IDs
- Proper error handling with console logging

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and has both variables
- Restart your dev server after adding env vars
- Check variable names match exactly (case-sensitive)

### "Failed to store airdrop"
- Verify the SQL schema was run successfully
- Check RLS policies are enabled
- Look at browser console for detailed error messages

### Data not showing in Supabase
- Check the **Table Editor** in Supabase dashboard
- Make sure you're looking at the correct project
- Verify RLS policies allow reading data

## Production Deployment

When deploying to Vercel/production:
1. Add the same environment variables in your hosting platform
2. Consider adding authentication for airdrop creation
3. Set up database backups in Supabase (automatic by default)
4. Monitor usage in Supabase dashboard

## Pricing

Supabase Free Tier includes:
- ✅ 500 MB database space
- ✅ 1 GB file storage
- ✅ 2 GB bandwidth
- ✅ 50,000 monthly active users

This is more than enough for most airdrop use cases!
