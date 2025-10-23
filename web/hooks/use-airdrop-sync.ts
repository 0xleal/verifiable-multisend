/**
 * React hook for automatic airdrop sync with retry logic
 *
 * Features:
 * - Auto-retry on app mount
 * - Exponential backoff
 * - localStorage persistence
 * - Manual sync trigger
 */

import { useEffect, useState, useCallback } from "react";
import {
  getAllPendingSyncs,
  removePendingSync,
  updateRetryCount,
  getRetryDelay,
  type PendingSync,
} from "@/lib/airdrop-sync-storage";

interface SyncStatus {
  isPending: boolean;
  isSyncing: boolean;
  failedSyncs: PendingSync[];
  lastError?: string;
}

/**
 * Attempt to sync a single airdrop to the backend
 */
async function syncAirdrop(pending: PendingSync): Promise<void> {
  const response = await fetch("/api/airdrops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pending.data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Sync failed");
  }
}

/**
 * Hook for managing airdrop sync operations
 */
export function useAirdropSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isPending: false,
    isSyncing: false,
    failedSyncs: [],
  });

  /**
   * Sync all pending airdrops from localStorage
   */
  const syncPending = useCallback(async () => {
    const pending = getAllPendingSyncs();

    if (pending.length === 0) {
      setStatus({
        isPending: false,
        isSyncing: false,
        failedSyncs: [],
      });
      return;
    }

    setStatus((prev) => ({ ...prev, isSyncing: true }));

    for (const sync of pending) {
      try {
        // Exponential backoff delay
        if (sync.retries > 0) {
          const delay = getRetryDelay(sync.retries);
          console.log(
            `Retrying airdrop ${sync.airdropId} after ${delay}ms (attempt ${sync.retries + 1})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Attempt sync
        await syncAirdrop(sync);

        // Success - remove from localStorage
        removePendingSync(sync.airdropId);
        console.log(`Successfully synced airdrop ${sync.airdropId}`);
      } catch (error: any) {
        console.error(`Failed to sync airdrop ${sync.airdropId}:`, error);

        // Update retry count
        const canRetry = updateRetryCount(sync.airdropId, error.message);

        if (!canRetry) {
          console.error(
            `Max retries exceeded for airdrop ${sync.airdropId}. Manual recovery required.`,
          );
        }
      }
    }

    // Update status after sync attempt
    const remaining = getAllPendingSyncs();
    setStatus({
      isPending: remaining.length > 0,
      isSyncing: false,
      failedSyncs: remaining.filter((p) => p.retries >= 5),
    });
  }, []);

  /**
   * Manually trigger a sync
   */
  const triggerSync = useCallback(() => {
    syncPending();
  }, [syncPending]);

  /**
   * Auto-sync on mount
   */
  useEffect(() => {
    syncPending();
  }, [syncPending]);

  return {
    ...status,
    syncPending,
    triggerSync,
  };
}
