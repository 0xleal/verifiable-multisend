"use client";

/**
 * Airdrop Recovery Page
 *
 * This page allows manual recovery of airdrop data that failed to sync
 * after max retries. Users can:
 * 1. See pending syncs from localStorage
 * 2. Manually retry failed syncs
 * 3. Upload CSV to regenerate and verify merkle tree
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  removePendingSync,
  getAllPendingSyncs,
  type PendingSync,
} from "@/lib/airdrop-sync-storage";

export default function RecoverPage() {
  const [pendingSyncs, setPendingSyncs] = useState<PendingSync[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSyncs();
  }, []);

  const loadSyncs = () => {
    const all = getAllPendingSyncs();
    setPendingSyncs(all);
  };

  const handleRetrySync = async (sync: PendingSync) => {
    setIsRetrying(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/airdrops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sync.data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Sync failed");
      }

      // Success! Remove from localStorage
      removePendingSync(sync.airdropId);
      setSuccess(`Successfully synced airdrop ${sync.airdropId}`);
      loadSyncs();
    } catch (e: any) {
      setError(`Failed to sync: ${e.message}`);
    } finally {
      setIsRetrying(false);
    }
  };


  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Airdrop Recovery</h1>

      {/* Pending Syncs Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Pending Syncs</h2>

        {pendingSyncs.length === 0 ? (
          <p className="text-muted-foreground">No pending syncs found.</p>
        ) : (
          <div className="space-y-4">
            {pendingSyncs.map((sync) => (
              <div
                key={sync.airdropId}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{sync.airdropId}</p>
                  <p className="text-sm text-muted-foreground">
                    Retries: {sync.retries} / 5
                  </p>
                  {sync.lastError && (
                    <p className="text-sm text-destructive">
                      Error: {sync.lastError}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleRetrySync(sync)}
                  disabled={isRetrying}
                >
                  {isRetrying ? "Retrying..." : "Retry Now"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>


      {/* Status Messages */}
      {error && (
        <div className="mt-6 p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-6 p-4 bg-green-500/10 text-green-600 rounded-lg">
          {success}
        </div>
      )}
    </div>
  );
}
