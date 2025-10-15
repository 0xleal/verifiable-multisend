# Verifiable Multisend (Celo Sepolia) — Next.js + Hardhat + Self.xyz

## Architecture

- Monorepo layout
  - `apps/web` — Next.js 14 (App Router, TS) UI
  - `contracts` — Hardhat (TS), Solidity 0.8.28
  - `packages/shared` — shared types/utils (CSV parsing schemas, ABI types)

## Networks & Assets

- Target: Celo Sepolia (dev); Celo Mainnet later
- Assets: CELO native + ERC20
- Batch caps: 200 recipients (ERC20), 300 recipients (native) per tx

## Self.xyz Integration (on-chain)

- Use `@selfxyz/contracts` (`SelfVerificationRoot`) wired to Hub V2
- Scope: set per-contract via `scopeSeed` in constructors
- Configs:
  - Sender (direct multisend): “human-only” config (no age/OFAC)
  - Claim drops: per-drop config; toggles for `olderThan=18`, `ofacEnabled`, optional `forbiddenCountries`
- Register configs on-chain to get `configId`; frontend must build QR with exactly the same config/scope

## Smart Contracts (contracts/)

- `contracts/src/MultiSendSelfGuarded.sol`

  - Inherits `SelfVerificationRoot`
  - Stores `verificationConfigId` (human-only) set in constructor via Hub registration
  - Enforce recipient caps, non-reentrant, safe math
  - ERC20 path: `batchSendERC20(address token, address[] recipients, uint256[] amounts, bytes proofPayload)`
  - Native path: `batchSendNative(address[] recipients, uint256[] amounts, bytes proofPayload)` payable
  - Both paths: verify Self proof first, then execute sends; emit events; reject zero address, length mismatch, overflow total
  - Use OpenZeppelin `SafeERC20`, `ReentrancyGuard`

- `contracts/src/ClaimDropSelf.sol`

  - Inherits `SelfVerificationRoot`
  - Drop struct: `{address token; bytes32 merkleRoot; uint256 total; uint256 funded; bytes32 configId; bool isNative;}`
  - Mappings: `dropId => Drop`, `dropId => claimed[leaf]`
  - Functions:
    - `createDrop(UnformattedVerificationConfigV2 cfg, address token, bytes32 merkleRoot, uint256 total, bool isNative)` → registers cfg → stores `configId`; for ERC20, set token; for native, set `isNative`
    - `fundDrop(uint256 dropId, uint256 amount)` for ERC20 (pull via allowance) and `fundDropNative(uint256 dropId)` payable for CELO
    - `claim(uint256 dropId, uint256 amount, bytes32[] merkleProof, bytes proofPayload)` → verify Self proof (uses per-drop `configId`) → verify Merkle leaf `(msg.sender, amount)` → transfer
    - `sweepUnclaimed(uint256 dropId, address to)` after optional deadline
  - Enforce per-call recipient claim only once; use caps at create time by validating the list size client-side; merkle keeps on-chain storage minimal

- Config selection

  - `MultiSendSelfGuarded.getConfigId(...)` returns stored `verificationConfigId`
  - `ClaimDropSelf.getConfigId(...)` returns drop’s stored `configId`

- Hardening
  - Guard native sends (check sufficient `msg.value` / funded escrow)
  - Checks-effects-interactions; nonReentrant
  - Emit events: `BatchSent`, `DropCreated`, `DropFunded`, `Claimed`, `Swept`

## Hardhat Setup (contracts/)

- TS config, dotenv, `@openzeppelin/contracts`, `@selfxyz/contracts`
- Network config for Celo Sepolia (chainId 11142220), Forno RPC; gas price auto
- Scripts
  - `scripts/deploy.ts` — deploy both contracts with scope seeds (e.g., "multisend-v1", "claimdrop-v1")
  - `scripts/createDrop.ts` — build Merkle, call `createDrop` with per-drop Self config (age/OFAC toggles)
  - `scripts/fundDrop.ts` — approve and fund ERC20; or send CELO
  - `scripts/claim.ts` — example claim with proofPayload param
- Tests
  - Unit tests for batch send limits, ERC20 and native
  - Merkle verification and double-claim prevention
  - Basic reentrancy checks
  - Note: Self proof end-to-end requires testnet; unit tests mock the hub interface where applicable

## Web App (apps/web)

- Tech: Next.js 14 (App Router), TypeScript, Tailwind, wagmi + RainbowKit + viem with Celo Sepolia
- Flows

1. Upload/parse CSV (Papaparse) or paste list; schema: `address,amount`

2. Token selection: native CELO or ERC20 address; fetch `decimals`, format amounts → `BigInt`

3. Mode selection: Direct send vs Claim drop

4. Self verification

   - Direct: generate QR (human-only) and pass `proofPayload` to `batchSend*`
   - Claim: build per-drop QR using drop’s `configId` and contract scope; claimers use it on claim page

5. Direct send UI

   - Chunk recipients to ≤200 (ERC20) or ≤300 (native); show batches, cost estimate, progress bar
   - For ERC20: allowance check/approve; then call batches

6. Claim drop UI

   - Build Merkle tree client-side; show root/total; call `createDrop` with chosen config (age 18, OFAC on/off)
   - Fund step (approve+fund or send CELO)
   - Generate per-recipient claim links including `(address,amount,proof)` encoded; export CSV of links

7. Claim page `/claim/[dropId]`

   - Reads query params (`amount`, `proof`, optional index)
   - Wallet connect → show Self QR for the drop’s config/scope → submit `claim`

- Components
  - `components/CsvUploader.tsx`, `RecipientsTable.tsx`, `TokenSelector.tsx`, `ModeSelector.tsx`
  - `DirectSender.tsx`, `CreateDropWizard.tsx`, `ClaimWidget.tsx`
- Self SDK
  - `@selfxyz/qrcode` to render QR and return `proofPayload`
  - Ensure frontend config matches contract `configId` and contract `scope()`

## Data & Precision

- Use token `decimals` via `viem` `readContract` to scale amounts
- Validate addresses (checksum) and non-zero amounts; sum for funding

## Deployment & Ops

- ENV: RPC URLs, contract addresses, Self Hub addresses
- CI scripts for lint/build/typecheck
- Manual test on Celo Sepolia with Self mock passports

## Essential Contract Signatures

```solidity
// MultiSendSelfGuarded
function batchSendERC20(address token, address[] calldata recipients, uint256[] calldata amounts, bytes calldata proofPayload) external nonReentrant;
function batchSendNative(address[] calldata recipients, uint256[] calldata amounts, bytes calldata proofPayload) external payable nonReentrant;

// ClaimDropSelf
function createDrop(SelfUtils.UnformattedVerificationConfigV2 calldata cfg, address token, bytes32 merkleRoot, uint256 total, bool isNative) external returns (uint256 dropId);
function fundDrop(uint256 dropId, uint256 amount) external; // ERC20
function fundDropNative(uint256 dropId) external payable; // CELO
function claim(uint256 dropId, uint256 amount, bytes32[] calldata merkleProof, bytes calldata proofPayload) external nonReentrant;
```
