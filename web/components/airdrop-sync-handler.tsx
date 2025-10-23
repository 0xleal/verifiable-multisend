"use client";

/**
 * Auto-sync handler for pending airdrop syncs
 *
 * This component runs on every page load and attempts to sync
 * any pending airdrops from localStorage to the backend.
 *
 * Features:
 * - Runs silently in the background
 * - Exponential backoff retry
 * - No UI (silent recovery)
 */

import { useEffect } from "react";
import { useAirdropSync } from "@/hooks/use-airdrop-sync";

export function AirdropSyncHandler() {
  const { isPending, isSyncing, failedSyncs } = useAirdropSync();

  // Log status for debugging (optional - can be removed in production)
  useEffect(() => {
    if (isPending && !isSyncing) {
      console.log("Airdrop sync in progress...");
    }
    if (failedSyncs.length > 0) {
      console.warn(
        `${failedSyncs.length} airdrop(s) failed to sync after max retries. Manual recovery may be needed.`,
        failedSyncs.map((s) => s.airdropId),
      );
    }
  }, [isPending, isSyncing, failedSyncs]);

  // This component renders nothing - it only runs side effects
  return null;
}
