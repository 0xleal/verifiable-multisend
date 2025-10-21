"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  ShieldCheck,
} from "lucide-react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useSwitchChain,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import { SelfVerifiedMultiSendAbi } from "@/lib/contracts/self-verified-multisend-abi";
import { useEffect } from "react";
import { SelfQRcodeWrapper, SelfAppBuilder } from "@selfxyz/qrcode";
import { celoSepolia } from "wagmi/chains";
import { waitForTransactionReceipt } from "wagmi/actions";
import { config } from "@/lib/wagmi-config";

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
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  const [tokenAddress, setTokenAddress] = useState("");
  const [isDistributing, setIsDistributing] = useState(false);
  const [transactions, _setTransactions] = useState<TransactionStatus[]>([]);
  const [mode, setMode] = useState<DistributionMode>("individual");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  const contractAddress =
    "0x33041027dd8F4dC82B6e825FB37ADf8f15d44053".toLowerCase() as `0x${string}`;
  const chainId = celoSepolia.id;

  // const { data: scope } = useReadContract({
  //   address: contractAddress,
  //   abi: SelfVerifiedMultiSendAbi,
  //   functionName: "getScope",
  //   chainId,
  //   query: { enabled: !!contractAddress },
  // } as any);

  // Self frontend expects the short scope seed string, not the on-chain scope hash/uint256
  const scopeSeed = "self-backed-sender";

  const { data: expiresAt, refetch: refetchExpiresAt } = useReadContract({
    address: contractAddress,
    abi: SelfVerifiedMultiSendAbi,
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
    if (!scopeSeed || !contractAddress) return;
    const userId =
      (address as string) || "0x0000000000000000000000000000000000000000";
    try {
      const app = new SelfAppBuilder({
        version: 2,
        appName: "Verifiable Multisend",
        scope: "self-backed-sender",
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
  }, [scopeSeed, address, contractAddress]);

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
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!chain || chain.id !== celoSepolia.id) {
      switchChain?.({ chainId: celoSepolia.id });
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

    setIsDistributing(true);
    try {
      const addrs = recipients.map((r) => r.address as `0x${string}`);
      const amts = recipients.map((r) => parseEther(r.amount as `${string}`));
      const value = amts.reduce((a, b) => a + b);

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: SelfVerifiedMultiSendAbi,
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

      const receipt = await waitForTransactionReceipt(config, {
        hash: txHash,
      });

      if (receipt.status === "success") {
        _setTransactions([
          {
            address: "batch",
            amount: formatEther(value),
            status: "success",
            hash: txHash as string,
          },
        ]);
        setSuccessTxHash(txHash);
        setShowSuccessModal(true);
      } else {
        _setTransactions([
          {
            address: "batch",
            amount: formatEther(value),
            status: "error",
            error: "Transaction failed",
            hash: txHash as string,
          },
        ]);
      }
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
              Leave empty to distribute native tokens (CELO)
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
              Claim
            </Button>
            <Button
              variant={mode === "batch" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("batch")}
              disabled={isDistributing}
              className="flex-1"
            >
              Send (Gas Efficient)
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
          disabled={
            !isConnected ||
            isDistributing ||
            isSwitchingChain ||
            recipients.length === 0
          }
          className="w-full"
          size="lg"
        >
          {isDistributing || isSwitchingChain ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isSwitchingChain ? "Switching network..." : "Distributing..."}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Distribute to {recipients.length}{" "}
              {recipients.length === 1 ? "Recipient" : "Recipients"}
            </>
          )}
        </Button>

        {/* Verification Modal */}
        {verifyOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Verify Your Identity
                </CardTitle>
                <CardDescription>
                  To ensure the security of this platform, we require a one-time
                  verification of your identity using the Self app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {verificationSuccess ? (
                  <div className="flex flex-col items-center justify-center text-center p-8">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold">
                      Verification Successful!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      You can now proceed with the token distribution.
                    </p>
                  </div>
                ) : (
                  <>
                    {selfApp ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Scan this QR code with your Self app to verify your
                          identity on-chain. This is required once every 30 days
                          to enable token distribution. You can download Self{" "}
                          <a href="https://self.xyz" target="_blank">
                            here
                          </a>
                          .
                        </p>
                        <SelfQRcodeWrapper
                          selfApp={selfApp}
                          onSuccess={() => {
                            setVerificationSuccess(true);
                            setTimeout(() => {
                              refetchExpiresAt?.();
                              setVerifyOpen(false);
                              setVerificationSuccess(false); // Reset for next time
                            }, 2000);
                          }}
                          onError={(error) => {
                            console.error(
                              "Error: Failed to verify identity",
                              error
                            );
                            setVerificationError(
                              "Verification failed. Please try again."
                            );
                          }}
                        />
                      </>
                    ) : (
                      <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading QR Code...
                      </div>
                    )}

                    {verificationError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{verificationError}</AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {/* Transaction Success Modal */}
        {showSuccessModal && successTxHash && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Transaction Successful!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Your token distribution has been successfully processed.</p>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Transaction Hash:</span>
                  <a
                    href={`${chain?.blockExplorers?.default.url}/tx/${successTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-mono text-sm truncate"
                  >
                    {successTxHash}
                  </a>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
