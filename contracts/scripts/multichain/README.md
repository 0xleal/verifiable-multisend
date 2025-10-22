# HumanPay Multi-Chain Deployment Guide

Deploy and manage HumanPay verification registries and business logic contracts across multiple chains.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│         Celo Sepolia                │
│  (Source - Self.xyz verification)   │
├─────────────────────────────────────┤
│  CeloVerificationRegistry           │
│  ├─ Receives Self.xyz proofs        │
│  └─ Relays to other chains          │
│                                     │
│  SelfVerifiedMultiSend              │
│  SelfVerifiedAirdrop                │
└─────────────────┬───────────────────┘
                  │
            Hyperlane Relay
                  │
                  ▼
┌─────────────────────────────────────┐
│         Base Sepolia                │
│    (Destination - Cross-chain)      │
├─────────────────────────────────────┤
│  CrossChainVerificationRegistry     │
│  ├─ Receives from Celo via Hyperlane│
│  └─ Same interface as Celo          │
│                                     │
│  SelfVerifiedMultiSend              │
│  SelfVerifiedAirdrop                │
│  (IDENTICAL to Celo!)               │
└─────────────────────────────────────┘
```

## 📋 Prerequisites

### 1. Environment Setup

Create a `.env` file in the `contracts` directory:

```bash
# Required
PRIVATE_KEY=0x...your-private-key

# Optional (uses public RPCs if not set)
CELO_SEPOLIA_RPC=https://alfajores-forno.celo-testnet.org
BASE_SEPOLIA_RPC=https://sepolia.base.org
```

### 2. Get Testnet Tokens

**Celo Sepolia:**
- Faucet: https://faucet.celo.org
- Need: ~0.1 CELO for deployment + relay fees

**Base Sepolia:**
- Faucet: https://faucet.quicknode.com/base/sepolia
- Need: ~0.01 ETH for deployment

### 3. Configure Self.xyz

Before deploying to Celo, you need:

1. **Self.xyz Hub V2 Address** on Celo Sepolia
   - Check: https://docs.self.xyz/deployed-contracts
   - Update in: `scripts/multichain/config.ts` → `NETWORKS.celoSepolia.selfxyz.hubV2`

2. **Verification Config ID**
   - Generate at: https://tools.self.xyz
   - Configure: age limits, country restrictions, OFAC checks
   - Update in: `scripts/multichain/config.ts` → `VERIFICATION_CONFIG_ID`

3. **Scope Seed** (optional to customize)
   - Default: `"humanpay-multichain"`
   - Update in: `scripts/multichain/config.ts` → `VERIFICATION_SCOPE_SEED`

## 🚀 Deployment Steps

### Step 1: Deploy to Celo Sepolia

```bash
npx hardhat run scripts/multichain/deploy-celo.ts --network celo_sepolia
```

**What this deploys:**
- ✅ `CeloVerificationRegistry` - Receives Self.xyz proofs, relays to other chains
- ✅ `SelfVerifiedMultiSend` - Bulk token distributions
- ✅ `SelfVerifiedAirdrop` - Merkle-based airdrops

**Output:**
```
🎉 Celo Sepolia Deployment Complete!
📋 Deployed Contracts:
   CeloVerificationRegistry: 0x...
   SelfVerifiedMultiSend:    0x...
   SelfVerifiedAirdrop:      0x...
```

Addresses are saved to `scripts/multichain/deployed-addresses.json`.

### Step 2: Deploy to Base Sepolia

```bash
npx hardhat run scripts/multichain/deploy-base.ts --network base_sepolia
```

**What this deploys:**
- ✅ `CrossChainVerificationRegistry` - Receives verifications from Celo
- ✅ `SelfVerifiedMultiSend` - Same contract as Celo
- ✅ `SelfVerifiedAirdrop` - Same contract as Celo

**Automatic Configuration:**
- Reads Celo registry address from `deployed-addresses.json`
- Fetches verification scope from Celo
- Adds Celo registry as trusted sender
- Enables sender enforcement

**Output:**
```
🎉 Base Sepolia Deployment Complete!
📋 Deployed Contracts:
   CrossChainVerificationRegistry: 0x...
   SelfVerifiedMultiSend:          0x...
   SelfVerifiedAirdrop:            0x...

🔐 Trusted Sender Configuration:
   Celo Registry: 0x...
   Status: ✅ Added and enforced
```

## 🔄 Verification Flow

### Step 3: User Verifies on Celo

Users verify using the Self.xyz mobile app:

1. Open Self.xyz app
2. Scan NFC passport
3. App submits proof to `CeloVerificationRegistry` on Celo
4. Verification stored with 30-day expiry

**Check verification:**
```bash
npx hardhat run scripts/multichain/check-verification.ts --network celo_sepolia
```

**Or check specific user:**
```bash
USER_ADDRESS=0x123... npx hardhat run scripts/multichain/check-verification.ts --network celo_sepolia
```

### Step 4: Relay Verification to Base

Anyone can relay verifications (relayer pays Hyperlane fees):

```bash
# Relay your own verification
npx hardhat run scripts/multichain/relay-verification.ts --network celo_sepolia

# Relay someone else's verification
USER_ADDRESS=0x123... npx hardhat run scripts/multichain/relay-verification.ts --network celo_sepolia
```

**What happens:**
1. ✅ Checks user is verified on Celo
2. 💰 Estimates Hyperlane relay fees (~0.005 CELO)
3. 📤 Sends cross-chain message to Base
4. ⏱️ Hyperlane delivers in 1-5 minutes

**Track delivery:**
- Hyperlane Explorer: https://explorer.hyperlane.xyz/
- Message includes: user address + expiry timestamp

### Step 5: Confirm Verification on Base

Wait 1-5 minutes, then check:

```bash
npx hardhat run scripts/multichain/check-verification.ts --network base_sepolia
```

**Expected output:**
```
✅ Status: VERIFIED
⏰ Expires: 2024-12-20T10:30:00.000Z
📅 Time remaining: 29 days, 23 hours
```

## 🎯 Using the Contracts

### MultiSend on Base

Once verified, users can distribute tokens:

```typescript
// User already verified on Celo + relayed to Base

const multiSend = await ethers.getContractAt(
  "SelfVerifiedMultiSend",
  "0x...multiSendAddress"
);

// Distribute ERC20
await multiSend.airdropERC20(
  tokenAddress,
  [recipient1, recipient2, recipient3],
  [amount1, amount2, amount3],
  totalAmount
);

// Distribute ETH
await multiSend.airdropETH(
  [recipient1, recipient2],
  [amount1, amount2],
  { value: totalAmount }
);
```

### Airdrop on Base

Create merkle-based airdrops:

```typescript
import { MerkleTree } from "merkletreejs";

// Create merkle tree
const leaves = [
  { address: claimer1, amount: parseEther("100") },
  { address: claimer2, amount: parseEther("200") },
];

const elements = leaves.map((leaf, index) =>
  keccak256(solidityPacked(["uint256", "address", "uint256"], [index, leaf.address, leaf.amount]))
);

const merkleTree = new MerkleTree(elements, keccak256, { sortPairs: true });
const merkleRoot = merkleTree.getHexRoot();

// Create airdrop (creator must be verified)
const airdrop = await ethers.getContractAt(
  "SelfVerifiedAirdrop",
  "0x...airdropAddress"
);

await airdrop.createAirdropERC20(
  airdropId,
  merkleRoot,
  tokenAddress,
  totalAmount
);

// Claimers claim (must be verified)
const proof = merkleTree.getHexProof(elements[0]);
await airdrop.claim(airdropId, 0, amount, proof);
```

## 📁 File Structure

```
scripts/multichain/
├── config.ts                    # Network configurations
├── deploy-celo.ts              # Deploy to Celo Sepolia
├── deploy-base.ts              # Deploy to Base Sepolia
├── relay-verification.ts       # Relay verification cross-chain
├── check-verification.ts       # Check verification status
├── deployed-addresses.json     # Auto-generated deployment addresses
└── README.md                   # This file
```

## 🔧 Configuration Options

### Update Network Config

Edit `scripts/multichain/config.ts`:

```typescript
export const NETWORKS = {
  celoSepolia: {
    // ...
    selfxyz: {
      hubV2: "0xYourActualHubAddress", // ⚠️ UPDATE THIS
    },
  },
};

export const VERIFICATION_CONFIG_ID = "0xYourConfigId"; // ⚠️ UPDATE THIS
export const VERIFICATION_SCOPE_SEED = "your-custom-scope"; // Optional
```

### Add New Chain

To add Arbitrum, Optimism, etc:

1. Add config to `NETWORKS` in `config.ts`
2. Create `deploy-arbitrum.ts` (copy `deploy-base.ts`)
3. Update Hyperlane domain IDs
4. Deploy!

## 🧪 Testing

Run all tests including end-to-end scenarios:

```bash
npm test
```

Test specific suite:

```bash
npm test -- --grep "Cross-Chain"
```

## 🐛 Troubleshooting

### "AccountNotVerified" error

**Problem:** User not verified or expired on Celo.

**Solution:**
```bash
# Check status
npx hardhat run scripts/multichain/check-verification.ts --network celo_sepolia

# If expired, verify again with Self.xyz app
```

### "UntrustedSender" error

**Problem:** Celo registry not whitelisted on Base.

**Solution:**
```bash
# Manually add trusted sender
npx hardhat console --network base_sepolia

> const registry = await ethers.getContractAt("CrossChainVerificationRegistry", "0x...baseRegistryAddress")
> await registry.addTrustedSender("0x...celoRegistryAddress")
> await registry.setTrustedSenderEnforcement(true)
```

### "MailboxNotConfigured" error

**Problem:** Hyperlane mailbox not set or incorrect.

**Solution:**
- Check `config.ts` has correct mailbox addresses
- Verify: https://docs.hyperlane.xyz/docs/reference/contract-addresses

### Verification not arriving on Base

**Problem:** Hyperlane delivery delayed or failed.

**Solution:**
1. Check Hyperlane Explorer: https://explorer.hyperlane.xyz/
2. Look for your message ID (from relay script output)
3. Usually arrives in 1-5 minutes
4. If stuck >10 mins, check both chain RPCs are working

### Self.xyz Hub address not found

**Problem:** Hub V2 address not updated in config.

**Solution:**
- Check latest addresses: https://docs.self.xyz/deployed-contracts
- Update `config.ts` → `NETWORKS.celoSepolia.selfxyz.hubV2`

## 📚 Additional Resources

- **Self.xyz Documentation:** https://docs.self.xyz
- **Self.xyz Tools:** https://tools.self.xyz (generate config IDs)
- **Hyperlane Docs:** https://docs.hyperlane.xyz
- **Hyperlane Explorer:** https://explorer.hyperlane.xyz
- **Celo Faucet:** https://faucet.celo.org
- **Base Faucet:** https://faucet.quicknode.com/base/sepolia

## 🎉 Success Checklist

After deployment and testing:

- [ ] Celo contracts deployed and verified
- [ ] Base contracts deployed and verified
- [ ] Self.xyz Hub and Config ID configured
- [ ] Test user verified on Celo
- [ ] Verification relayed to Base successfully
- [ ] MultiSend works on both chains
- [ ] Airdrop works on both chains
- [ ] Trusted sender enforcement active on Base
- [ ] Deployment addresses saved and backed up

## 🔒 Security Notes

1. **Private Keys:** Never commit `.env` to git
2. **Trusted Senders:** Only whitelist your Celo registry
3. **Config IDs:** Use restrictive configs (age limits, country blocks)
4. **Scope Consistency:** Same scope across all chains
5. **Expiry Sync:** Exact 30-day expiry preserved cross-chain

## 💬 Support

Need help? Check:
- Test suite: `test/CrossChainVerification.spec.ts` - 85 passing tests
- Contract source: `contracts/src/` - Fully documented
- This README - Comprehensive deployment guide

Ready to deploy to production? Remember to:
1. Update to mainnet addresses
2. Use mainnet RPCs
3. Audit contracts thoroughly
4. Test on testnet first
5. Monitor Hyperlane deliveries

Good luck! 🚀
