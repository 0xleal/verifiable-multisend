# 🚀 Quick Start: Deploy HumanPay Multi-Chain

Get HumanPay running on Celo Sepolia and Base Sepolia in 5 minutes.

## ⚡ Prerequisites

1. **Get testnet tokens:**
   - Celo Sepolia: https://faucet.celo.org (~0.1 CELO)
   - Base Sepolia: https://faucet.quicknode.com/base/sepolia (~0.01 ETH)

2. **Setup `.env`:**
   ```bash
   cd contracts
   cp .env.example .env
   # Edit .env and add your PRIVATE_KEY
   ```

3. **Update Self.xyz config** in `scripts/multichain/config.ts`:
   - ✅ `NETWORKS.celoSepolia.selfxyz.hubV2` - Already configured for Celo Sepolia testnet
   - `VERIFICATION_CONFIG_ID` - Generate at https://tools.self.xyz (or use default 0x0 for testing)

## 📝 Deploy in 3 Steps

### 1️⃣ Deploy to Celo

```bash
npx hardhat run scripts/multichain/deploy-celo.ts --network celo_sepolia
```

**Output:**
```
✅ CeloVerificationRegistry deployed: 0xABC...
✅ SelfVerifiedMultiSend deployed: 0xDEF...
✅ SelfVerifiedAirdrop deployed: 0xGHI...
```

### 2️⃣ Deploy to Base

```bash
npx hardhat run scripts/multichain/deploy-base.ts --network base_sepolia
```

**Output:**
```
✅ CrossChainVerificationRegistry deployed: 0xJKL...
✅ SelfVerifiedMultiSend deployed: 0xMNO...
✅ SelfVerifiedAirdrop deployed: 0xPQR...
🔐 Trusted Sender: ✅ Added and enforced
```

### 3️⃣ Test the Flow

**A. Verify on Celo:**
1. Open Self.xyz mobile app
2. Scan your NFC passport
3. Submit proof to Celo registry (from deploy output)

**B. Check verification:**
```bash
npx hardhat run scripts/multichain/check-verification.ts --network celo_sepolia
```

**C. Relay to Base:**
```bash
npx hardhat run scripts/multichain/relay-verification.ts --network celo_sepolia
```

**D. Wait 1-5 minutes, then check Base:**
```bash
npx hardhat run scripts/multichain/check-verification.ts --network base_sepolia
```

**E. Use MultiSend on Base:**
```typescript
// You're now verified on Base! Use any contract:
const multiSend = "0x..."; // From deploy output
const airdrop = "0x...";   // From deploy output

// Distribute tokens, create airdrops, etc.
```

## 🎯 Deployment Addresses

All addresses saved in: `scripts/multichain/deployed-addresses.json`

```json
{
  "celoSepolia": {
    "registry": "0x...",
    "multiSend": "0x...",
    "airdrop": "0x..."
  },
  "baseSepolia": {
    "registry": "0x...",
    "multiSend": "0x...",
    "airdrop": "0x..."
  }
}
```

## 🧪 Testing

Run the full test suite (85 tests):

```bash
npm test
```

Run only cross-chain tests:

```bash
npm test -- --grep "Cross-Chain"
```

## 📚 Full Documentation

See [README.md](./README.md) for:
- Complete architecture explanation
- Troubleshooting guide
- Contract usage examples
- Security considerations

## ❓ Common Issues

**"AccountNotVerified"**
→ Verify on Celo first with Self.xyz app

**"UntrustedSender"**
→ Run deploy-base.ts again (auto-configures trusted sender)

**Verification not on Base**
→ Wait 1-5 minutes after relay, then check again

**Self.xyz Hub not found**
→ Update `config.ts` with correct Hub V2 address from docs

## ✅ Success Checklist

- [x] Deployed to Celo Sepolia
- [x] Deployed to Base Sepolia
- [x] Verified on Celo with Self.xyz
- [x] Relayed to Base
- [x] Confirmed verification on Base
- [ ] Ready to use MultiSend/Airdrop!

## 🎉 You're Done!

Your contracts are now live on both chains. Users verify once on Celo, relay to Base, and use everywhere!

**Next:** Build your frontend or use the contracts programmatically.

**Need help?** Check the full [README.md](./README.md) or review the test suite for examples.
