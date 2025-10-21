import { keccak256, solidityPacked } from "ethers";
import { MerkleTree } from "merkletreejs";

export interface Recipient {
  address: string;
  amount: string;
}

export interface MerkleData {
  root: string;
  recipients: Array<{
    address: string;
    amount: string;
    index: number;
    proof: string[];
  }>;
}

/**
 * Creates a merkle tree from recipients list
 * Uses the same format as the contract: keccak256(abi.encodePacked(index, address, amount))
 */
export function createMerkleTree(recipients: Recipient[]): MerkleData {
  // Create leaves with index, address, and amount (same as contract)
  const leaves = recipients.map((recipient, index) => {
    return keccak256(
      solidityPacked(
        ["uint256", "address", "uint256"],
        [index, recipient.address, recipient.amount]
      )
    );
  });

  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = merkleTree.getHexRoot();

  // Generate proofs for each recipient
  const recipientsWithProofs = recipients.map((recipient, index) => ({
    address: recipient.address,
    amount: recipient.amount,
    index,
    proof: merkleTree.getHexProof(leaves[index]),
  }));

  return {
    root,
    recipients: recipientsWithProofs,
  };
}

/**
 * Verifies a merkle proof
 */
export function verifyMerkleProof(
  proof: string[],
  root: string,
  index: number,
  address: string,
  amount: string
): boolean {
  const leaf = keccak256(
    solidityPacked(["uint256", "address", "uint256"], [index, address, amount])
  );
  return MerkleTree.verify(proof, leaf, root, keccak256, { sortPairs: true });
}
