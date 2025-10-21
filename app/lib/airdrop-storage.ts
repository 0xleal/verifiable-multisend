/**
 * Simple in-memory storage for airdrop data
 * In production, this should be replaced with a proper database
 */

export interface AirdropData {
  id: string; // The unique identifier (not hashed)
  airdropIdHash: string; // The keccak256 hash used onchain
  recipients: Array<{
    address: string;
    amount: string;
    index: number;
    proof: string[];
  }>;
  merkleRoot: string;
  tokenAddress: string;
  totalAmount: string;
  creator: string;
  createdAt: number;
  txHash?: string;
}

// In-memory storage (replace with database in production)
const airdrops = new Map<string, AirdropData>();

export const AirdropStorage = {
  /**
   * Store airdrop data
   */
  async set(id: string, data: AirdropData): Promise<void> {
    airdrops.set(id.toLowerCase(), data);
  },

  /**
   * Retrieve airdrop data by identifier
   */
  async get(id: string): Promise<AirdropData | null> {
    return airdrops.get(id.toLowerCase()) || null;
  },

  /**
   * Check if airdrop exists
   */
  async exists(id: string): Promise<boolean> {
    return airdrops.has(id.toLowerCase());
  },

  /**
   * Delete airdrop data
   */
  async delete(id: string): Promise<void> {
    airdrops.delete(id.toLowerCase());
  },

  /**
   * Get all airdrops (for debugging/admin)
   */
  async getAll(): Promise<AirdropData[]> {
    return Array.from(airdrops.values());
  },
};
