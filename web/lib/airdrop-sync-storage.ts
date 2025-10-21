/**
 * Client-side localStorage for pending airdrop syncs
 *
 * This provides defense-in-depth against data loss if:
 * - User closes browser before API sync completes
 * - Network issues during sync
 * - Backend temporarily unavailable
 */

import type { AirdropData } from "./airdrop-storage";

const STORAGE_KEY = "pending_airdrop_syncs";
const MAX_RETRIES = 5;

export interface PendingSync {
  airdropId: string;
  data: AirdropData;
  timestamp: number;
  retries: number;
  lastError?: string;
}

/**
 * Save airdrop data to localStorage for later sync
 */
export function savePendingSync(airdropId: string, data: AirdropData): void {
  if (typeof window === "undefined") return; // SSR guard

  try {
    const pending = getAllPendingSyncs();

    // Check if already exists
    const existingIndex = pending.findIndex((p) => p.airdropId === airdropId);

    const syncData: PendingSync = {
      airdropId,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    if (existingIndex >= 0) {
      // Update existing
      pending[existingIndex] = syncData;
    } else {
      // Add new
      pending.push(syncData);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error("Failed to save pending sync to localStorage:", error);
  }
}

/**
 * Get all pending syncs from localStorage
 */
export function getAllPendingSyncs(): PendingSync[] {
  if (typeof window === "undefined") return []; // SSR guard

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read pending syncs from localStorage:", error);
    return [];
  }
}

/**
 * Remove a pending sync after successful sync
 */
export function removePendingSync(airdropId: string): void {
  if (typeof window === "undefined") return; // SSR guard

  try {
    const pending = getAllPendingSyncs();
    const filtered = pending.filter((p) => p.airdropId !== airdropId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove pending sync from localStorage:", error);
  }
}

/**
 * Update retry count and error message for a pending sync
 */
export function updateRetryCount(
  airdropId: string,
  error?: string
): boolean {
  if (typeof window === "undefined") return false; // SSR guard

  try {
    const pending = getAllPendingSyncs();
    const index = pending.findIndex((p) => p.airdropId === airdropId);

    if (index === -1) return false;

    pending[index].retries += 1;
    pending[index].lastError = error;

    // If max retries exceeded, keep it but mark as failed
    if (pending[index].retries >= MAX_RETRIES) {
      console.warn(
        `Max retries (${MAX_RETRIES}) exceeded for airdrop ${airdropId}. Manual recovery required.`
      );
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    return pending[index].retries < MAX_RETRIES;
  } catch (error) {
    console.error("Failed to update retry count in localStorage:", error);
    return false;
  }
}

/**
 * Get pending syncs that haven't exceeded max retries
 */
export function getRetryableSyncs(): PendingSync[] {
  return getAllPendingSyncs().filter((p) => p.retries < MAX_RETRIES);
}

/**
 * Get pending syncs that have exceeded max retries (need manual recovery)
 */
export function getFailedSyncs(): PendingSync[] {
  return getAllPendingSyncs().filter((p) => p.retries >= MAX_RETRIES);
}

/**
 * Clear all pending syncs (use with caution!)
 */
export function clearAllPendingSyncs(): void {
  if (typeof window === "undefined") return; // SSR guard

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear pending syncs from localStorage:", error);
  }
}

/**
 * Exponential backoff delay calculator
 */
export function getRetryDelay(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  return Math.min(1000 * Math.pow(2, retryCount), 16000);
}
