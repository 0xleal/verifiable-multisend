# HumanPay

**Compliant cross-border payments infrastructure for the decentralized web.**

HumanPay is an open-source protocol that enables anyone to send crypto payments across borders while maintaining regulatory compliance—without relying on centralized intermediaries, traditional banking rails, or sacrificing user privacy.

## The Problem

Cross-border payments are broken, and crypto hasn't fully solved it yet:

**Traditional Finance:**
- 3-7 day settlement times for international wire transfers
- 3-7% fees extracted by banks and intermediaries (SWIFT, correspondent banks)
- Requires local banking relationships in every operating country
- Excludes 1.4 billion unbanked people globally
- Manual compliance checks that don't scale
- Business hours and weekend delays

**Existing Crypto Solutions:**
- **Centralized exchanges** (Coinbase, Binance) require full KYC, custody your funds, and can freeze accounts
- **DEXs and DeFi protocols** have no compliance layer—forcing users into regulatory gray zones
- **No on-chain compliance proofs**—you can't demonstrate OFAC/sanctions screening without trusted third parties
- **Bot exploitation**—token distributions and airdrops lose millions to sybil attackers
- **Regional restrictions impossible to enforce**—no trustless way to limit distributions by jurisdiction

**The Gap:** We need infrastructure that combines crypto's **instant settlement** and **global accessibility** with traditional finance's **compliance guarantees**—all without centralized custody or invasive data collection.

Current solutions force an impossible choice:
1. **Centralized platforms** (Wise, Revolut, exchanges) that custody funds, collect extensive personal data, and control access
2. **Unprotected smart contracts** that can't enforce compliance, leading to regulatory risk and potential sanctions violations
3. **Traditional banking** with prohibitive costs ($30-50 per wire), exclusionary access requirements, and multi-day delays

## The Solution

HumanPay combines **zero-knowledge identity verification** with **gas-optimized batch transfers** to create compliant cross-border payment infrastructure that:

✅ **Instant settlement** - Payments arrive in seconds, not days
✅ **70%+ cheaper** - Single batch transaction vs. individual transfers
✅ **Regulatory compliant** - OFAC screening, jurisdiction controls, age verification
✅ **Privacy-preserving** - Zero-knowledge proofs mean no personal data on-chain
✅ **Non-custodial** - You control your funds at all times
✅ **Globally accessible** - Anyone with a passport/ID and internet connection
✅ **Trustless verification** - Cryptographic proofs replace manual KYC processes
✅ **Expiring credentials** - 30-day verification expiry ensures ongoing compliance

### Two Operating Modes

#### 1. **Distribute Mode** (Sender Verification)
Push payments to multiple international recipients in a single transaction. Only the sender needs identity verification.

**Use cases:**
- **International contractor payments** - Pay a global team across 20+ countries instantly
- **Cross-border payroll** - DAO paying contributors in Argentina, India, Nigeria, Philippines
- **Remittances** - Send money to family abroad without 7% Western Union fees
- **Multi-currency settlements** - Pay multiple vendors/suppliers in different countries
- **Emergency relief** - Deliver aid funds directly to recipients in crisis zones

**How it works:**
1. Upload CSV with recipient addresses and amounts
2. Verify your identity via Self.xyz (valid for 30 days, cryptographically proves OFAC compliance)
3. Execute one on-chain transaction—everyone gets paid simultaneously
4. Recipients receive funds directly to their wallets (no claiming, no coordination)

**vs. Traditional Wire Transfers:**
| | HumanPay | Bank Wire |
|---|---|---|
| **Settlement Time** | Instant (seconds) | 3-7 business days |
| **Cost per transfer** | ~$0.50 (gas) | $30-50 per wire |
| **Batch 50 payments** | $25 total | $1,500-2,500 total |
| **Compliance** | ZK proof (automated) | Manual review (days) |
| **Custody** | Non-custodial | Bank holds funds |
| **Access** | Anyone with crypto wallet | Requires bank account |

#### 2. **Airdrop Mode** (Recipient Verification)
Create a compliance-gated token distribution where each recipient must verify their identity before claiming.

**Use cases:**
- **Compliant token launches** - Distribute governance tokens while excluding sanctioned countries
- **Region-specific programs** - Limit participation to specific jurisdictions (e.g., EU-only, US-excluded)
- **Age-gated distributions** - Ensure recipients meet age requirements (+21 for certain tokens)
- **One-person-one-allocation** - Prevent sybil attacks and multi-accounting
- **Regulated asset distributions** - Prove compliance for security tokens or restricted assets

**How it works:**
1. Creator uploads recipient allowlist and deposits tokens with merkle root
2. Recipients verify identity via Self.xyz (must pass OFAC, jurisdiction, age checks)
3. Each recipient claims their allocation on-chain using merkle proof
4. Smart contract enforces: one claim per person, no sanctioned addresses, jurisdiction compliance
5. Creator has cryptographic proof of compliance for auditors/regulators

**vs. Centralized Airdrops:**
| | HumanPay | Centralized Platform |
|---|---|---|
| **KYC Data** | Zero-knowledge (stays on device) | Full collection (stored centrally) |
| **Sybil Resistance** | Passport + ZK proof | Email/social (gameable) |
| **Compliance Proof** | On-chain, auditable | Trust platform's claims |
| **Custody** | Non-custodial | Platform holds tokens |
| **Privacy** | Government ID never shared | Documents uploaded to servers |
| **Geographic Controls** | Enforced by smart contract | Platform policy (changeable) |

## Why Zero-Knowledge Identity?

[Self.xyz](https://self.xyz) enables **cryptographic identity verification** using government-issued documents (ePassports, EU ID cards) without revealing personal information:

**How it works:**
1. **NFC chip reading** - User scans their passport/ID with Self.xyz mobile app
2. **Government signature validation** - Cryptographically verifies document authenticity using country's public keys
3. **Zero-knowledge proof generation** - Proves attributes (e.g., "over 21", "not in sanctioned country") without revealing name, DOB, address
4. **On-chain verification** - Smart contract validates proof and grants 30-day access
5. **Compliance attestation** - Immutable on-chain record that sender/recipient passed verification

**Privacy guarantees:**
- **No personal data on-chain** - Only cryptographic proofs stored
- **No data sent to HumanPay** - Verification happens between user's device and Self.xyz
- **Selective disclosure** - Prove only what's required (e.g., "not OFAC sanctioned" without revealing nationality)
- **Liveness detection** - Prevents spoofing with photos or videos

**Compliance capabilities:**
- ✅ OFAC sanctions screening
- ✅ Country/jurisdiction restrictions (include or exclude specific regions)
- ✅ Age verification (e.g., 18+, 21+)
- ✅ Document authenticity (validates government-issued credentials)
- ✅ Liveness detection (confirms real person, not bot)
- ✅ Renewable verification (30-day expiry ensures ongoing compliance)

Each verification costs a small fee (paid to Self.xyz), creating an economic barrier to sybil attacks while preserving privacy.

## Use Case Examples

### 🌍 Global Remote Team Payroll
A software company employs 50 contractors across 25 countries (Nigeria, Philippines, Argentina, India, Poland, Brazil, etc.).

**Traditional approach:**
- Set up banking relationships in each country (weeks of paperwork)
- Wire $50k total payroll → Pay $1,500+ in wire fees
- Wait 3-7 days for funds to arrive (longer for some countries)
- Manual compliance checks for each contractor
- Contractors lose 3-5% converting to local currency at banks

**With HumanPay:**
- Treasurer verifies identity once via Self.xyz (30-day validity)
- Upload payroll CSV on payday
- Execute single transaction: $50k distributed, $25 gas fee
- All 50 contractors receive funds within seconds
- Each contractor converts to local currency via local DEX/exchange at better rates
- **Net savings: $1,475+ per month + instant settlement**

### 💸 Remittance Corridor (US → Philippines)
Maria works in the US and sends $500/month to her family in Manila.

**Traditional approach (Western Union/bank):**
- $500 - $35 fee = $465 received
- Family waits 1-3 days for funds
- Annual cost: $420 in fees (7% of total)

**With HumanPay:**
- Maria verifies once/month via Self.xyz
- Sends USDC directly to family's wallet
- Cost: ~$0.50 in gas fees
- Family receives in seconds, converts to PHP locally
- **Annual savings: $414 (99% fee reduction)**

### 🪂 Compliant Token Launch (Exclude US/Sanctioned Countries)
A DeFi protocol launches a governance token and must exclude US persons and OFAC-sanctioned countries for regulatory reasons.

**Traditional approach:**
- Use centralized platform (collects full KYC data of all users)
- Trust platform's compliance claims
- Users must upload passport scans to centralized servers (data breach risk)
- Platform takes 10-20% of token allocation as fee

**With HumanPay Airdrop Mode:**
- Configure Self.xyz verification: OFAC check + exclude US
- Create merkle tree with 10,000 eligible addresses
- Deposit tokens to smart contract
- Recipients verify identity (ZK proof stays private)
- Only compliant users can claim (enforced by smart contract)
- Protocol has on-chain proof of compliance for regulators
- **Zero personal data stored, zero platform custody, zero trust assumptions**

### 🆘 Humanitarian Aid Distribution
An NGO distributes emergency funds to 200 individuals in a crisis zone where banking infrastructure is damaged.

**Traditional approach:**
- Requires intact banking system (often unavailable)
- Cash distribution = high risk of theft/corruption
- Slow (days to weeks for wire transfers)
- Difficult to verify recipients (potential for fraud)

**With HumanPay:**
- Recipients only need: passport + smartphone + internet
- NGO verifies sender identity (demonstrates proper fund custody)
- Recipients verify via Self.xyz (prevents duplicate claims)
- Execute distribution → funds arrive in seconds
- Recipients can use crypto locally or convert to cash via local exchanges
- **Full audit trail on-chain, cryptographic proof of recipient verification**

### 💼 Cross-Border B2B Settlements
A marketplace platform pays 100 vendors across Europe, Asia, and Latin America monthly.

**Traditional approach:**
- Manual SWIFT payments to each vendor
- 100 vendors × $40/wire = $4,000 in fees
- 3-5 day settlement per payment
- Currency conversion fees (3-5%)
- Requires detailed banking info from each vendor

**With HumanPay:**
- Platform verifies once per month
- Upload vendor payment CSV
- One transaction → all vendors paid instantly
- Cost: ~$50 in gas (99% fee reduction)
- Vendors receive stablecoins (USDC/USDT) and convert locally
- **Savings: $3,950/month + instant settlement + simplified accounting**

## How It Works

### Smart Contract Architecture

HumanPay consists of three core contracts:

1. **SelfVerifiedDrop.sol** - Compliant sender-gated batch distribution
   - Sender must pass Self.xyz verification (OFAC + jurisdiction checks)
   - Execute `airdropETH()` or `airdropERC20()` with arrays of recipients and amounts
   - Single transaction sends to unlimited recipients
   - Verification valid for 30 days, then must renew

2. **SelfVerifiedAirdrop.sol** - Compliant recipient-gated merkle claims
   - Creator deposits tokens with merkle root
   - Recipients must verify via Self.xyz before claiming
   - Enforces one-claim-per-person using merkle proofs
   - Configurable compliance rules (OFAC, age, jurisdiction)

3. **SelfProtectedDrop.sol** - Gas-optimized baseline (no verification)
   - Pure assembly implementation for maximum efficiency
   - No verification gates—use for trusted/internal distributions
   - 70%+ gas savings compared to individual transfers

All contracts use **assembly-optimized loops** for batch operations, minimizing gas costs.

### Verification Flow

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ 1. Scan QR code with Self app
       ▼
┌─────────────────────┐
│   Self.xyz App      │  2. NFC scan of passport/ID
│  (Zero-Knowledge)   │  3. Generate ZK proof (OFAC + jurisdiction)
└──────┬──────────────┘
       │ 4. Submit proof to contract
       ▼
┌─────────────────────┐
│  Identity Hub       │  5. Verify proof on-chain
│  (Celo Sepolia)     │  6. Call verification hook
└──────┬──────────────┘
       │ 7. Store verification expiry (30 days)
       ▼
┌─────────────────────┐
│  HumanPay Contract  │  8. User can now send cross-border
│  (Compliant Layer)  │     payments for 30 days
└─────────────────────┘
```

### Technical Stack

**Smart Contracts:**
- Solidity ^0.8.28
- OpenZeppelin Contracts 5.0.2
- Self.xyz Contracts 1.2.3
- Gas-optimized assembly for batch operations

**Frontend:**
- Next.js 15.5.4 with React 19
- TypeScript 5
- Wagmi 2.18.1 + Viem 2.38.2
- TanStack Query
- Radix UI + Tailwind CSS

**Blockchain:**
- Celo Sepolia (testnet)
- Self.xyz Identity Hub V2
- Planned: Ethereum, Base, Optimism, Arbitrum

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- A Web3 wallet (MetaMask, WalletConnect, etc.)
- Celo Sepolia testnet tokens ([get from faucet](https://faucet.celo.org/alfajores))
- A passport or EU ID card (for Self.xyz verification)

### Installation

```bash
# Clone the repository
git clone https://github.com/talentprotocol/humanpay.git
cd humanpay

# Install frontend dependencies
npm install

# Install contract dependencies
cd contracts
npm install
cd ..
```

### Running the Frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the payment interface.

### Deploying Contracts

```bash
cd contracts

# Deploy SelfVerifiedDrop (sender-gated distribution)
npx hardhat run scripts/deploy-self-verified-drop-celo-sepolia.ts --network celo-sepolia

# Deploy SelfVerifiedAirdrop (recipient-gated claims)
npx hardhat run scripts/deploy-self-verified-airdrop.ts --network celo-sepolia
```

## Usage

### Distribute Mode (Cross-Border Batch Payments)

1. **Connect Wallet**: Connect your wallet to Celo Sepolia network
2. **Verify Identity**:
   - Click "Distribute" to trigger verification modal
   - Scan QR code with Self.xyz app
   - Complete identity verification (valid for 30 days)
   - Verification proves you pass OFAC/sanctions screening
3. **Upload Recipients**:
   - Prepare CSV file with format: `address,amount`
   - Upload via drag-and-drop or paste directly
4. **Execute Distribution**:
   - Review recipient list and total amount
   - Click "Distribute" to execute batch transaction
   - All recipients receive tokens simultaneously

**Example CSV:**
```csv
address,amount
0x1234567890123456789012345678901234567890,1.5
0x2345678901234567890123456789012345678901,2.0
0x3456789012345678901234567890123456789012,0.75
```

### Airdrop Mode (Compliant Token Claims)

*Coming soon to frontend interface*

Use the smart contract directly:

```solidity
// 1. Creator: Deposit tokens with merkle root
createAirdropETH{value: 10 ether}(merkleRoot);

// 2. Recipient: Verify identity via Self.xyz (must pass OFAC + jurisdiction checks)

// 3. Recipient: Claim allocation with merkle proof
claim(airdropId, amount, proof);
```

## Configuration

### Self.xyz Verification Settings

Edit verification parameters in the smart contract:

```solidity
// Scope seed (identifies your application)
string scopeSeed = "self-backed-sender";

// Config ID (defines verification requirements)
bytes32 configId = 0x32332b93...;  // OFAC + Country + Age checks
```

Create custom verification configs at [Self.xyz Platform](https://platform.self.xyz).

### Supported Compliance Checks

- ✅ **OFAC sanctions screening** - Blocks addresses from sanctioned countries
- ✅ **Age verification** - Enforce minimum age (+21, +18, etc.)
- ✅ **Country restrictions** - Include or exclude specific jurisdictions
- ✅ **Document type** - Require passport, EU ID card, or specific credentials
- ✅ **Liveness detection** - Prevent spoofing attacks

### Network Configuration

Currently deployed on **Celo Sepolia** (testnet):
- Chain ID: 11142220
- RPC: `https://forno.celo-sepolia.celo-testnet.org`
- Block Explorer: [https://sepolia.celoscan.io](https://sepolia.celoscan.io)
- Contract: `0xC2FE5379a4c096e097d47f760855B85edDF625e2`

**Why Celo?**
- Mobile-first design (many users in emerging markets access crypto via phone)
- Low transaction fees (critical for small remittances)
- Stablecoin-native (cUSD, cEUR for easy cross-border payments)
- Fast block times (5 seconds vs. Ethereum's 12)

## Security & Compliance

### Security Considerations

- **Verification Expiry**: All verifications expire after 30 days. Users must re-verify to maintain compliance.
- **Zero-Knowledge Proofs**: No personal data stored on-chain or transmitted to contract.
- **Merkle Proofs**: Airdrop claims validated against merkle roots to prevent over-distribution.
- **Gas Optimization**: Assembly-level optimization minimizes attack surface and execution cost.
- **Access Control**: Owner-controlled configuration for verification parameters.
- **Non-Custodial**: Users maintain full control of funds at all times.

### Compliance Features

- **OFAC Screening**: Automated sanctions checking via Self.xyz verification
- **Jurisdiction Controls**: Enforce country-level restrictions trustlessly
- **Audit Trail**: All verifications and distributions recorded on-chain
- **Renewable Credentials**: 30-day expiry ensures ongoing compliance (not one-time-forever)
- **Privacy-Preserving**: Compliant without collecting/storing personal data

## Roadmap

- [x] Core smart contracts (Distribute + Airdrop modes)
- [x] Self.xyz integration with 30-day verification
- [x] Frontend for batch ETH distribution
- [x] CSV upload and validation
- [ ] Airdrop mode frontend (creator + claimer UI)
- [ ] ERC20 token support in frontend (USDC, USDT, cUSD)
- [ ] Mainnet deployment (Celo, Ethereum, Base, Optimism)
- [ ] Stablecoin-optimized flows (USDC/USDT for remittances)
- [ ] Recurring payment scheduling (set-and-forget payroll)
- [ ] Multi-chain support (Polygon, Arbitrum, Avalanche)
- [ ] Fiat on/off-ramp integrations (local exchanges per region)
- [ ] API for programmatic distributions
- [ ] Analytics dashboard (payment history, compliance reports, gas savings)
- [ ] Mobile app (Self.xyz already mobile-first, extend to full payment flow)

## Why Build This?

Cross-border payments move **$150 trillion annually**, with **$700 billion in remittances alone**. Yet the infrastructure is:
- Expensive (3-7% average fees)
- Slow (3-7 days settlement)
- Exclusive (1.4B unbanked)
- Compliance-risky (manual KYC doesn't scale)

Crypto promises to fix this, but existing solutions either:
1. **Sacrifice compliance** (pure DeFi = regulatory risk)
2. **Sacrifice decentralization** (centralized exchanges = custody risk)
3. **Sacrifice privacy** (full KYC platforms = data breach risk)

**HumanPay solves the trilemma:** compliant + decentralized + private.

This is **open-source infrastructure for the future of global payments**—built for:
- Remote work (pay global teams instantly)
- Remittances (send money home without 7% fees)
- Humanitarian aid (deliver funds to crisis zones)
- Compliant token distributions (launch without regulatory risk)
- B2B cross-border settlements (eliminate wire fees)

## Contributing

We welcome contributions! This is an open-source public good.

**Priority areas:**
- Frontend enhancements (better UX, mobile optimization)
- Additional chain integrations (Base, Arbitrum, etc.)
- Stablecoin-specific optimizations
- Gas optimization improvements
- Security audits and reviews
- Regional fiat on/off-ramp integrations
- Documentation and tutorials
- Use case implementations (remittance corridors, payroll templates)

Please open an issue or submit a pull request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Resources

- **Self.xyz Documentation**: [https://docs.self.xyz](https://docs.self.xyz)
- **Celo Documentation**: [https://docs.celo.org](https://docs.celo.org)
- **Self.xyz Hub V2** (Celo Sepolia): `0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74`
- **Block Explorer**: [https://sepolia.celoscan.io](https://sepolia.celoscan.io)

## Acknowledgments

- Gas optimization techniques adapted from [GasliteDrop](https://github.com/PopPunkLLC/gaslite-core) by GasliteGG
- Zero-knowledge verification powered by [Self.xyz](https://self.xyz)
- Built on [Celo](https://celo.org) for accessible, mobile-first global payments

---

**Building the compliance layer for decentralized cross-border payments.**

*Because sending money across borders shouldn't cost 7% and take 7 days.*

Questions? Open an issue or reach out to the team.
