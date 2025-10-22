# Deployment Status & Checklist

## ✅ Ready for Deployment

All deployment infrastructure is complete and ready for testing on **Celo Sepolia** and **Base Sepolia**.

---

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] Copy `.env.example` to `.env`
  ```bash
  cp .env.example .env
  ```

- [ ] Add your private key to `.env`
  ```
  PRIVATE_KEY=0x...your-private-key-here
  ```

- [ ] **IMPORTANT:** Never commit `.env` to git (already in `.gitignore`)

### 2. Get Testnet Tokens

- [ ] **Celo Sepolia:** Get ~0.1 CELO from https://faucet.celo.org
- [ ] **Base Sepolia:** Get ~0.01 ETH from https://faucet.quicknode.com/base/sepolia

### 3. Configuration Review

All configs are pre-configured in `scripts/multichain/config.ts`:

- ✅ **Self.xyz Hub V2** (Celo Sepolia): `0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74`
- ✅ **Verification Config ID**: `0xb26cf7b8241189fc0e21080899fcb88ff11b8d1e58eb1eded5db28ebdcb0e718` (no restrictions)
- ✅ **Hyperlane Mailbox** (Celo): `0xEf9F292fcEBC3848bF4bB92a96a04F9ECBb78E59`
- ✅ **Hyperlane Mailbox** (Base): `0xfFAEF09B3cd11D9b20d1a19bECca54EEC2884766`
- ✅ **Scope Seed**: `"humanpay-multichain"`

**Optional:** Customize the verification config at https://tools.self.xyz to add:
- Minimum age requirements
- Country exclusions
- OFAC checks

---

## 🚀 Deployment Steps

### Step 1: Deploy to Celo Sepolia

```bash
npx hardhat run scripts/multichain/deploy-celo.ts --network celo_sepolia
```

**Expected Output:**
```
✅ CeloVerificationRegistry deployed: 0xABC...
✅ SelfVerifiedMultiSend deployed: 0xDEF...
✅ SelfVerifiedAirdrop deployed: 0xGHI...
✅ Addresses saved to scripts/multichain/deployed-addresses.json
```

**Checklist:**
- [ ] Deployment succeeded
- [ ] All 3 contracts deployed
- [ ] Addresses saved to `deployed-addresses.json`
- [ ] Copy addresses to your notes for reference

### Step 2: Deploy to Base Sepolia

```bash
npx hardhat run scripts/multichain/deploy-base.ts --network base_sepolia
```

**Expected Output:**
```
✅ CrossChainVerificationRegistry deployed: 0xJKL...
✅ SelfVerifiedMultiSend deployed: 0xMNO...
✅ SelfVerifiedAirdrop deployed: 0xPQR...
🔐 Trusted Sender: ✅ Added and enforced
```

**Checklist:**
- [ ] Deployment succeeded
- [ ] All 3 contracts deployed
- [ ] Trusted sender automatically configured
- [ ] Addresses saved to `deployed-addresses.json`

---

## 🧪 Testing the Full Flow

### Step 3: Verify on Celo

**Using Self.xyz App:**
1. Download Self.xyz mobile app (if you don't have it)
2. Open app and select "Verify with Passport"
3. Scan your NFC-enabled passport
4. Submit proof to Celo Sepolia network

**Check Verification:**
```bash
npx hardhat run scripts/multichain/check-verification.ts --network celo_sepolia
```

**Expected Output:**
```
✅ Status: VERIFIED
⏰ Expires: 2025-XX-XXT...
📅 Time remaining: 29 days, 23 hours
```

**Checklist:**
- [ ] Successfully verified on Celo
- [ ] Check script shows VERIFIED status
- [ ] Expiry is ~30 days from now

### Step 4: Relay to Base

```bash
npx hardhat run scripts/multichain/relay-verification.ts --network celo_sepolia
```

**Expected Output:**
```
✅ User verified on Celo (expires: ...)
💰 Estimated fee: 0.005 CELO
📤 Relaying verification to Base...
✅ Relay successful!
   Message ID: 0x...
   Track on Hyperlane Explorer: https://explorer.hyperlane.xyz/...
```

**Checklist:**
- [ ] Relay transaction succeeded
- [ ] Message ID received
- [ ] Fee paid (~0.005 CELO)

### Step 5: Confirm on Base

Wait 1-5 minutes for Hyperlane delivery, then:

```bash
npx hardhat run scripts/multichain/check-verification.ts --network base_sepolia
```

**Expected Output:**
```
✅ Status: VERIFIED
⏰ Expires: 2025-XX-XXT... (same as Celo)
📅 Time remaining: 29 days, 23 hours
```

**Checklist:**
- [ ] Verification arrived on Base
- [ ] Same expiry timestamp as Celo
- [ ] Status shows VERIFIED

---

## 📊 File Structure

```
scripts/multichain/
├── config.ts                    ✅ Network configs (ready)
├── deploy-celo.ts              ✅ Celo deployment (ready)
├── deploy-base.ts              ✅ Base deployment (ready)
├── relay-verification.ts       ✅ Relay script (ready)
├── check-verification.ts       ✅ Check script (ready)
├── deployed-addresses.json     📝 Auto-generated after deployment
├── README.md                   📚 Full documentation
├── QUICKSTART.md              📚 5-minute guide
└── DEPLOYMENT_STATUS.md       📝 This file
```

---

## 🧪 Test Suite Status

**All tests passing:** ✅ 85/85

```bash
npm test
```

**Test Breakdown:**
- Business logic tests: 62 ✅
- Cross-chain tests: 23 ✅
  - Registry relay: 10 ✅
  - Trusted senders: 6 ✅
  - End-to-end flows: 7 ✅

---

## 🔍 Verification Commands

### Check Balance
```bash
# Celo Sepolia
npx hardhat run --network celo_sepolia -c "console.log(await ethers.provider.getBalance((await ethers.getSigners())[0].address))"

# Base Sepolia
npx hardhat run --network base_sepolia -c "console.log(await ethers.provider.getBalance((await ethers.getSigners())[0].address))"
```

### Check Specific User
```bash
USER_ADDRESS=0x123... npx hardhat run scripts/multichain/check-verification.ts --network celo_sepolia
```

### Relay Someone Else's Verification
```bash
USER_ADDRESS=0x123... npx hardhat run scripts/multichain/relay-verification.ts --network celo_sepolia
```

---

## 🔗 Useful Links

### Self.xyz
- **Docs:** https://docs.self.xyz
- **Tools:** https://tools.self.xyz (generate custom configs)
- **Deployed Contracts:** https://docs.self.xyz/deployed-contracts

### Hyperlane
- **Docs:** https://docs.hyperlane.xyz
- **Explorer:** https://explorer.hyperlane.xyz (track messages)

### Testnets
- **Celo Faucet:** https://faucet.celo.org
- **Base Faucet:** https://faucet.quicknode.com/base/sepolia
- **Celo Explorer:** https://sepolia.celoscan.io
- **Base Explorer:** https://sepolia.basescan.org

---

## ⚠️ Common Issues & Solutions

### "Insufficient funds"
- Get more testnet tokens from faucets
- Celo: https://faucet.celo.org
- Base: https://faucet.quicknode.com/base/sepolia

### "AccountNotVerified"
- Verify on Celo first using Self.xyz app
- Check status: `npx hardhat run scripts/multichain/check-verification.ts --network celo_sepolia`

### "UntrustedSender"
- Should be auto-configured by deploy-base.ts
- If needed, manually add: See README.md troubleshooting section

### Verification not arriving on Base
- Wait 1-5 minutes (Hyperlane delivery time)
- Check message on Hyperlane Explorer
- Verify you relayed from correct address

---

## 🎯 Next Steps After Deployment

1. **Test MultiSend on Base:**
   - Use the deployed MultiSend contract
   - Distribute test ERC20 tokens or ETH
   - Verify only verified users can send

2. **Test Airdrop on Base:**
   - Create a merkle-based airdrop
   - Have verified users claim
   - Test claim expiry

3. **Monitor Cross-Chain Flow:**
   - Verify multiple users on Celo
   - Relay to Base
   - Track messages on Hyperlane Explorer

4. **Consider Production:**
   - Audit contracts thoroughly
   - Use mainnet addresses
   - Set restrictive verification configs
   - Monitor gas costs

---

## ✨ You're Ready!

Everything is configured and ready to deploy. Follow the steps above to test the full cross-chain verification flow on Celo Sepolia and Base Sepolia.

**Quick Start:**
```bash
# 1. Setup environment
cp .env.example .env
# Add your PRIVATE_KEY to .env

# 2. Get testnet tokens
# Visit faucets for both chains

# 3. Deploy to Celo
npx hardhat run scripts/multichain/deploy-celo.ts --network celo_sepolia

# 4. Deploy to Base
npx hardhat run scripts/multichain/deploy-base.ts --network base_sepolia

# 5. Test verification flow
# Use Self.xyz app → verify on Celo → relay → confirm on Base
```

Good luck! 🚀
