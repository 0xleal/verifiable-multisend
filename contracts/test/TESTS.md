## Contracts tests overview

This document details the intent, setup, and coverage of the tests under `contracts/test`.

- **Suites covered**: `Airdrop` and `SelfProtectedDrop`.
- **Approach**: For the `Airdrop` contract, we simulate the Self verification success hook via a small test-only wrapper contract that exposes a `trigger(bytes)` method, which internally calls the production `customVerificationHook(...)`. This lets us deterministically drive the hook logic inside tests without depending on external infrastructure. `SelfProtectedDrop` is tested directly.

### Common scaffolding and conventions

- **Network**: Hardhat local network; chain id `31337` is embedded in test-generated `userData` to mimic the real scope hashing for the `Airdrop` test.
- **Actors**: Signers are used consistently per suite (e.g., `hub` represents the verification hub invoker; `sender`/`owner`/`user`/`recipients` are scenario-dependent).
- **ERC20**: A simple `TestERC20` is used for minting and transfers during tests.
- **Hook invocation**: For `Airdrop`, we call `trigger(userData)` from the `hub` signer on the testable wrapper. In production, the Self Hub would call the hook; the wrapper is only for testing.

---

## Airdrop tests

File: `contracts/test/Airdrop.ts`

### Setup

- **Deployments**:
  - `TestableAirdrop(hub, scopeSeed, tokenAddress)` where:
    - `scopeSeed` is a test string (e.g., `"airdrop-example"`).
  - `TestERC20("Test", "TST")`.

### Test cases and coverage

- **registers via hook and allows merkle claim**
  - **What**: Full ERC20 flow—verifies a user, registers them, and allows them to claim tokens from an airdrop using a Merkle proof.
  - **How**:
    - Owner opens registration and claim phases.
    - A verification config ID is set.
    - The `trigger` function is called on `TestableAirdrop` to simulate a successful Self verification, which registers the user.
    - Registration is closed.
    - A Merkle root is set for the airdrop.
    - The airdrop contract is funded with tokens.
    - The registered user calls the `claim` function with a valid Merkle proof.
  - **Asserts**:
    - `Claimed` event is emitted with correct arguments.
    - The user's token balance increases by the claimed amount.
  - **Why**: Validates the entire lifecycle of the airdrop contract, including user verification, registration, and the claiming process with Merkle proof validation.

---

## SelfProtectedDrop tests

File: `contracts/test/SelfProtectedDrop.spec.ts`

### Test cases and coverage

- **sends ETH to many recipients**
  - **What**: Batch transfer native ETH to multiple recipients.
  - **How**: The `airdropETH` function is called with a list of recipients and amounts, and the total value is sent with the transaction.
  - **Asserts**:
    - Each recipient's balance increases by the expected amount.
  - **Why**: Validates the core functionality of batch sending ETH.

- **sends ERC20 to many recipients**
  - **What**: Batch transfer ERC20 tokens to multiple recipients.
  - **How**:
    - The sender is minted the total amount of tokens.
    - The sender approves the `SelfProtectedDrop` contract to spend the tokens.
    - The `airdropERC20` function is called with the token address, recipients, amounts, and total amount.
  - **Asserts**:
    - Each recipient's token balance increases by the correct amount.
    - The sender's token balance decreases by the total amount.
  - **Why**: Validates the core functionality of batch sending ERC20 tokens.

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

- The `TestableAirdrop` contract exists only to expose the `customVerificationHook(...)` entry point for testing. In production, the Self Hub would call into the hook with verified disclosures.