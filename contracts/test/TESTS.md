## Contracts tests overview

This document details the intent, setup, and coverage of the tests under `contracts/test`.

- **Suites covered**: `MultiSendSelfGuarded` and `ClaimDropSelf`
- **Approach**: We simulate the Self verification success hook via small test-only wrapper contracts that expose a `trigger(bytes)` method, which internally calls the production `customVerificationHook(...)`. This lets us deterministically drive the hook logic inside tests without depending on external infrastructure.

### Common scaffolding and conventions

- **Network**: Hardhat local network; chain id `31337` is embedded in test-generated `userData` to mimic the real scope hashing.
- **Actors**: Signers are used consistently per suite (e.g., `hub` represents the verification hub invoker; `sender`/`owner`/`claimer`/`recipients` are scenario-dependent).
- **ERC20**: A simple `TestERC20` is used for minting and transfers during tests.
- **Hook invocation**: We call `trigger(userData)` from the `hub` signer on the testable wrappers. In production, the Self Hub would call the hook; the wrapper is only for testing.
- **`userData` layout (by test builders)**:
  - Type `1`: ERC20 multisend payload
  - Type `2`: Native (ETH) multisend payload
  - Type `3`: Claim drop payout payload

---

## MultiSendSelfGuarded tests

File: `contracts/test/multisend.spec.ts`

### Setup

- **Deployments**:

  - `TestableMultiSendSelfGuarded(hub, scopeSeed, humanOnlyConfigId)` where:
    - `scopeSeed` is a test string (e.g., `"multisend-test"`).
    - `humanOnlyConfigId` is `keccak256("human-only-config")` (arbitrary stable id for tests).
  - `TestERC20("Test", "TST")`.

- **Initial state**:

  - For ERC20 tests, the `sender` is minted `10_000` tokens.
  - Helper builders construct `userData` containing destination chain id, a per-user identifier, and the ABI-encoded payload.

- **Why this setup**:
  - Provides a deterministic environment to validate batch semantics, event emissions, recipient validations, and accounting for both ERC20 and native transfers.
  - The approval/funding steps mirror real prerequisites: ERC20 approvals for token transfers and contract balance funding for native transfers.

### Test cases and coverage

- **sends ERC20 in batch via onVerificationSuccess hook**

  - **What**: Batch transfer ERC20 to multiple recipients.
  - **How**: `sender` approves `multisend` for `total` amount; build type-1 `userData` with `token`, `from`, `recipients`, `amounts`; call `trigger(userData)` as `hub`.
  - **Asserts**:
    - `BatchSent(sender, token, isNative=false, recipients.length, total)` emitted.
    - Recipients received exact amounts; sender balance decreased by `total`.
  - **Why**: Validates core ERC20 batch flow and event integrity.

- **reverts on too many recipients (ERC20)**

  - **What**: Input validation when recipients exceed configured bound.
  - **How**: Build arrays of length `201`; approve `total=201` and call `trigger`.
  - **Asserts**: Reverts with custom error `TooManyRecipients`.
  - **Why**: Ensures guardrails on batch size to limit gas and prevent abuse.

- **sends native in batch via onVerificationSuccess hook**

  - **What**: Batch transfer native ETH to multiple recipients.
  - **How**: Build type-2 `userData` with `from`, `recipients`, `amounts`, `total`. Pre-fund the `multisend` contract with `total`. Call `trigger(userData)` as `hub`.
  - **Asserts**:
    - `BatchSent(sender, 0x0, isNative=true, recipients.length, total)` emitted.
    - Recipients' balances each increase by the expected amount.
  - **Why**: Validates native transfer path and event integrity.

- **reverts on zero recipient (native)**
  - **What**: Input validation that disallows zero-address recipients.
  - **How**: Build payload with `[address(0)]` and call `trigger`.
  - **Asserts**: Reverts with custom error `ZeroAddress`.
  - **Why**: Prevents burned funds and enforces address validity.

---

## ClaimDropSelf tests

File: `contracts/test/claimdrop.spec.ts`

### Setup

- **Deployments**:

  - `TestableClaimDropSelf(hub, scopeSeed)`.
  - `TestERC20("Test", "TST")`.

- **Drop configuration**:

  - Config object used: `{ olderThan: 0, forbiddenCountries: [], ofacEnabled: false }` (minimal constraints to focus on payout logic).
  - Merkle root: for simplicity, tests use `keccak256(abi.encode(claimer, amount))` as both the leaf and root; this allows verifying inclusion logic in a minimal way without building a full Merkle tree.

- **Why this setup**:
  - Isolates drop creation, funding, claiming via hook, and sweeping remainder for both ERC20 and native flows, without external dependencies.

### Test cases and coverage

- **creates, funds, and claims ERC20 drop via hook**

  - **What**: Full ERC20 flow—create drop, fund it, then pay a claim via the verification hook.
  - **How**:
    - `owner` creates drop with ERC20 token, `total`, and `merkleRoot`.
    - `owner` mints and approves `total`, then calls `fundDrop(dropId, total)`.
    - Build type-3 `userData` with `dropId`, `claimer`, `amount`. Call `trigger(userData)` as `hub`.
  - **Asserts**:
    - `DropFunded(dropId, total, isNative=false)` emitted.
    - `Claimed(dropId, claimer, amount)` emitted.
    - Claimer receives tokens; `drops(dropId).funded` reduced by `amount`.
    - `claimed(dropId, leaf)` is `true`.
  - **Why**: Validates ERC20 claim path via hook and single-claim accounting.

- **creates, funds native, claims via hook, and sweeps remainder**
  - **What**: Full native flow—create drop with native currency, fund it, pay claim via hook, then sweep remaining funds to a receiver.
  - **How**:
    - `owner` creates native drop; funds via `fundDropNative(dropId, { value: total })`.
    - Build type-3 `userData`; call `trigger(userData)` as `hub`.
    - `owner` calls `sweepUnclaimed(dropId, sweepTo)`.
  - **Asserts**:
    - `DropFunded(dropId, total, isNative=true)` emitted.
    - Claimer's balance increases by `amount`.
    - `Swept(dropId, sweepTo, total - amount)` emitted and `sweepTo` receives exactly the remainder.
  - **Why**: Validates native claim path and post-claim reconciliation via sweeping.

---

## Running the tests

From the `contracts` directory:

```bash
npm test
# or
npx hardhat test
```

---

## Notes

- The `Testable*` contracts exist only to expose the `customVerificationHook(...)` entry point for testing. In production, the Self Hub would call into the hook with verified disclosures.
- Where negative tests expect custom errors (e.g., `TooManyRecipients`, `ZeroAddress`), these mirror input validation rules enforced by the production contracts to keep operations safe and predictable.
