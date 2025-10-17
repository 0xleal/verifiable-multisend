"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import { SelfVerifiedDropAbi } from "@/lib/contracts/self-verified-drop-abi";
import { useEffect } from "react";
import { countries, SelfQRcodeWrapper, SelfAppBuilder } from "@selfxyz/qrcode";

// NOTE: We build the Self app config once per address/scope and pass it to SelfQRcodeWrapper
import type { RecipientData } from "./csv-upload";

interface DistributionExecutorProps {
  recipients: RecipientData[];
}

interface TransactionStatus {
  address: string;
  amount: string;
  status: "pending" | "success" | "error";
  hash?: string;
  error?: string;
}

type DistributionMode = "individual" | "batch";

export function DistributionExecutor({
  recipients,
}: DistributionExecutorProps) {
  const { address, isConnected, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [tokenAddress, setTokenAddress] = useState("");
  const [isDistributing, setIsDistributing] = useState(false);
  const [transactions, _setTransactions] = useState<TransactionStatus[]>([]);
  const [mode, setMode] = useState<DistributionMode>("individual");
  const [verifyOpen, setVerifyOpen] = useState(false);

  const defaultDropAddress =
    "0x26b39829C82b0158852d3285A9c86117297ca237" as `0x${string}`;
  const contractAddress = ((process.env
    .NEXT_PUBLIC_SELF_DROP_ADDRESS as `0x${string}`) ||
    defaultDropAddress) as `0x${string}`;
  const chainId =
    chain?.id ?? Number(process.env.NEXT_PUBLIC_CHAIN_ID || 44787);

  const { data: scope } = useReadContract({
    address: contractAddress,
    abi: SelfVerifiedDropAbi,
    functionName: "getScope",
    chainId,
    query: { enabled: !!contractAddress },
  } as any);

  const {
    data: expiresAt,
    refetch: refetchExpiresAt,
  } = useReadContract({
    address: contractAddress,
    abi: SelfVerifiedDropAbi,
    functionName: "verificationExpiresAt",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    chainId,
    query: { enabled: !!contractAddress && !!address },
  } as any);

  const isVerified = useMemo(() => {
    if (!expiresAt) return false;
    const exp = Number(expiresAt as unknown as bigint);
    return exp > Math.floor(Date.now() / 1000);
  }, [expiresAt]);

  // Build and cache Self app config (follows docs pattern), bound to current address
  const [selfApp, setSelfApp] = useState<any | null>(null);

  useEffect(() => {
    if (!scope || !contractAddress) return;
    const userId =
      (address as string) || "0x0000000000000000000000000000000000000000";
    try {
      const app = new SelfAppBuilder({
        version: 2,
        appName:
          process.env.NEXT_PUBLIC_SELF_APP_NAME || "Verifiable Multisend",
        scope: String(scope),
        // Point Self to the on-chain contract endpoint (Celo testnet)
        endpoint: contractAddress,
        userId,
        endpointType: "staging_celo",
        userIdType: "hex",
        userDefinedData: "Sender verification for multisend",
        disclosures: {
          minimumAge: 18,
          ofac: true,
        },
      }).build();
      setSelfApp(app);
    } catch (e) {
      console.error("Failed to init Self app", e);
    }
  }, [scope, address, contractAddress]);

  const totalEth = useMemo(() => {
    try {
      if (recipients.length === 0) return "0";
      const values = recipients.map((r) => parseEther(r.amount as `${string}`));
      const sum = values.reduce((a, b) => a + b);
      return sum.toString();
    } catch {
      return "0";
    }
  }, [recipients]);

  const handleIndividualDistribution = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    if (recipients.length === 0) {
      alert("No recipients to distribute to");
      return;
    }

    alert("Individual distribution not implemented yet");

    setIsDistributing(false);
  };

  const handleBatchDistribution = async () => {
    if (!isConnected || !address || !chain) {
      alert("Please connect your wallet first");
      return;
    }

    if (recipients.length === 0) {
      alert("No recipients to distribute to");
      return;
    }

    if (!isVerified) {
      setVerifyOpen(true);
      return;
    }

    if (!contractAddress) {
      alert("Missing contract address configuration");
      return;
    }

    try {
      setIsDistributing(true);
      const addrs = recipients.map((r) => r.address as `0x${string}`);
      const amts = recipients.map((r) => parseEther(r.amount as `${string}`));
      const value = amts.reduce((a, b) => a + b);

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: SelfVerifiedDropAbi,
        functionName: "airdropETH",
        args: [addrs, amts],
        chainId,
        value,
      } as any);

      _setTransactions([
        {
          address: "batch",
          amount: formatEther(value),
          status: "pending",
          hash: txHash as string,
        },
      ]);
    } catch (e: any) {
      _setTransactions([
        {
          address: "batch",
          amount: totalEth,
          status: "error",
          error: e?.message || "Failed to send batch",
        },
      ]);
    } finally {
      setIsDistributing(false);
    }
  };

  const handleDistribute = () => {
    if (mode === "batch") {
      handleBatchDistribution();
    } else {
      handleIndividualDistribution();
    }
  };

  const progress =
    recipients.length > 0 ? (transactions.length / recipients.length) * 100 : 0;
  const successCount = transactions.filter(
    (t) => t.status === "success"
  ).length;
  const errorCount = transactions.filter((t) => t.status === "error").length;
  const pendingCount = transactions.filter(
    (t) => t.status === "pending"
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Execute Distribution
        </CardTitle>
        <CardDescription>
          Configure and execute the token distribution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token-address">
            Token Contract Address (Optional)
          </Label>
          <Input
            id="token-address"
            placeholder="0x..."
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            disabled={isDistributing}
            className="font-mono"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Leave empty to distribute native tokens (ETH)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Distribution Mode</Label>
          <div className="flex gap-2">
            <Button
              variant={mode === "individual" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("individual")}
              disabled={isDistributing}
              className="flex-1"
            >
              Individual
            </Button>
            <Button
              variant={mode === "batch" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("batch")}
              disabled={isDistributing}
              className="flex-1"
            >
              Batch (Gas Efficient)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === "individual"
              ? "Send one transaction per recipient (slower, more expensive)"
              : "Send all tokens in one transaction (faster, cheaper)"}
          </p>
        </div>

        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to distribute tokens
            </AlertDescription>
          </Alert>
        )}

        {isDistributing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>
                {successCount + errorCount} / {recipients.length}
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {transactions.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-4 text-sm flex-wrap">
              {successCount > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{successCount} successful</span>
                </div>
              )}
              {pendingCount > 0 && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{pendingCount} pending</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span>{errorCount} failed</span>
                </div>
              )}
            </div>

            <div className="border rounded-lg max-h-[200px] overflow-auto p-4 space-y-2">
              {transactions.map((tx, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs block truncate">
                      {tx.address.slice(0, 10)}...{tx.address.slice(-8)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {tx.amount} tokens
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {tx.status === "success" && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {tx.hash && (
                          <a
                            href={`${chain?.blockExplorers?.default.url}/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </>
                    )}
                    {tx.status === "pending" && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />
                    )}
                    {tx.status === "error" && (
                      <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errorCount > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {transactions.find((t) => t.status === "error")?.error ||
                    "Some transactions failed"}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {!isVerified && isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Sender not verified. Please verify with Self to enable sending.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleDistribute}
          disabled={!isConnected || isDistributing || recipients.length === 0}
          className="w-full"
          size="lg"
        >
          {isDistributing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Distributing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Distribute to {recipients.length}{" "}
              {recipients.length === 1 ? "Recipient" : "Recipients"}
            </>
          )}
        </Button>

        {/* Simple inline modal for Self QR verification */}
        {verifyOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border rounded-lg p-4 w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Verify with Self</h3>
                <button
                  className="text-muted-foreground text-sm"
                  onClick={() => setVerifyOpen(false)}
                >
                  Close
                </button>
              </div>
              {selfApp ? (
                <SelfQRcodeWrapper
                  selfApp={selfApp}
                  onSuccess={() => {
                    // After successful verification (handled by backend via endpoint), close modal
                    // and refetch verification status
                    refetchExpiresAt?.();
                    setVerifyOpen(false);
                  }}
                  onError={() => {
                    console.error("Error: Failed to verify identity");
                  }}
                />
              ) : (
                <div className="p-6 text-sm text-muted-foreground">
                  Loading QR…
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
