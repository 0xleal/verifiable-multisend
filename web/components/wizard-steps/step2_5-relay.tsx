"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Send,
  CheckCircle2,
  Info,
  ExternalLink,
} from "lucide-react";
import { useAccount, useWriteContract, useSwitchChain, useReadContract, usePublicClient } from "wagmi";
import { parseEther } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { config as wagmiConfig } from "@/lib/wagmi-config";
import { getVerificationChainConfig, getChainConfig } from "@/lib/chain-config";
import { celoSepolia, baseSepolia } from "wagmi/chains";
import type { DistributionConfig } from "./step3-configure";

interface Step2_5RelayProps {
  onNext: () => void;
  onBack: () => void;
  distributionConfig: DistributionConfig;
}

// Helper to convert Ethereum address to bytes32 for Hyperlane
function addressToBytes32(address: string): `0x${string}` {
  // Remove 0x prefix and pad to 64 characters (32 bytes)
  const addr = address.toLowerCase().replace("0x", "");
  return `0x${"0".repeat(24)}${addr}` as `0x${string}`;
}

export function Step2_5Relay({
  onNext,
  onBack,
  distributionConfig,
}: Step2_5RelayProps) {
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: baseSepolia.id });

  const [isRelaying, setIsRelaying] = useState(false);
  const [relaySuccess, setRelaySuccess] = useState(false);
  const [relayError, setRelayError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [relayStep, setRelayStep] = useState<
    "idle" | "switching" | "sending" | "waiting" | "polling" | "complete"
  >("idle");

  const celoConfig = getVerificationChainConfig();
  const targetConfig = getChainConfig(distributionConfig.chainId);

  const celoRegistryAddress = celoConfig.verificationRegistryAddress;
  const baseRegistryAddress = targetConfig?.verificationRegistryAddress;

  // Check if already verified on Base
  const { data: baseExpiresAt, refetch: refetchBaseVerification } =
    useReadContract({
      address: baseRegistryAddress,
      abi: targetConfig?.verificationRegistryAbi,
      functionName: "verificationExpiresAt",
      args: [address ?? "0x0000000000000000000000000000000000000000"],
      chainId: baseSepolia.id,
      query: { enabled: !!baseRegistryAddress && !!address },
    } as any);

  const isVerifiedOnBase = useMemo(() => {
    if (!baseExpiresAt) return false;
    const exp = Number(baseExpiresAt as unknown as bigint);
    return exp > Math.floor(Date.now() / 1000);
  }, [baseExpiresAt]);

  // Poll Base until verification appears
  const pollBaseUntilVerified = async (): Promise<boolean> => {
    const maxAttempts = 60; // 2 minutes max (2 second intervals)
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (!publicClient || !address || !baseRegistryAddress) {
          await new Promise((r) => setTimeout(r, pollInterval));
          continue;
        }

        const expiresAt = (await publicClient.readContract({
          address: baseRegistryAddress,
          abi: targetConfig?.verificationRegistryAbi,
          functionName: "verificationExpiresAt",
          args: [address],
        })) as bigint;

        const exp = Number(expiresAt);
        if (exp > Math.floor(Date.now() / 1000)) {
          return true; // Verified!
        }
      } catch (error) {
        console.error("Poll attempt failed:", error);
      }

      await new Promise((r) => setTimeout(r, pollInterval));
    }

    return false; // Timeout
  };

  const handleRelay = async () => {
    if (!address || !baseRegistryAddress) {
      setRelayError("Wallet not connected or Base registry not found");
      return;
    }

    setIsRelaying(true);
    setRelayError(null);
    setRelayStep("switching");

    try {
      // Step 1: Ensure on Celo Sepolia
      if (chain?.id !== celoSepolia.id) {
        await switchChain?.({ chainId: celoSepolia.id });
        // Wait a moment for chain switch to complete
        await new Promise((r) => setTimeout(r, 1000));
      }

      // Step 2: Convert recipient registry to bytes32
      const recipientRegistry = addressToBytes32(baseRegistryAddress);

      // Step 3: Call relay function
      setRelayStep("sending");
      const hash = await writeContractAsync({
        address: celoRegistryAddress,
        abi: celoConfig.verificationRegistryAbi,
        functionName: "relayVerificationTo",
        args: [
          84532, // Base Sepolia domain
          recipientRegistry,
          address,
        ],
        value: parseEther("0.01"), // Hyperlane fee (~$1)
        chainId: celoSepolia.id,
      });

      setTxHash(hash);

      // Step 4: Wait for transaction confirmation
      setRelayStep("waiting");
      await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: celoSepolia.id,
      });

      // Step 5: Poll Base until verification appears
      setRelayStep("polling");
      const verified = await pollBaseUntilVerified();

      if (verified) {
        setRelaySuccess(true);
        setRelayStep("complete");
        await refetchBaseVerification();

        // Auto-advance after 1.5 seconds
        setTimeout(() => {
          onNext();
        }, 1500);
      } else {
        setRelayError(
          "Hyperlane delivery timeout. Your verification should appear on Base within 2-3 minutes. You can proceed or wait."
        );
        setIsRelaying(false);
        setRelayStep("idle");
      }
    } catch (error: any) {
      console.error("Relay error:", error);
      setRelayError(
        error?.message || "Failed to relay verification. Please try again."
      );
      setIsRelaying(false);
      setRelayStep("idle");
    }
  };

  const handleSkip = () => {
    // User can skip if they want to relay manually later
    onNext();
  };

  const getStepMessage = () => {
    switch (relayStep) {
      case "switching":
        return "Switching to Celo Sepolia...";
      case "sending":
        return "Sending relay transaction...";
      case "waiting":
        return "Waiting for transaction confirmation...";
      case "polling":
        return "Waiting for Hyperlane delivery (30-60s)...";
      case "complete":
        return "Relay complete!";
      default:
        return "";
    }
  };

  // Skip this step if already verified on Base or not distributing on Base
  if (isVerifiedOnBase || distributionConfig.chainId === celoSepolia.id) {
    // Auto-skip
    setTimeout(() => onNext(), 0);
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold">
          Relay Verification to Base
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Bridge your verification from Celo to Base via Hyperlane
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-primary" />
            Cross-Chain Verification Relay
          </CardTitle>
          <CardDescription>
            Your identity was verified on Celo Sepolia. To create distributions
            on Base Sepolia, we need to relay this verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {relaySuccess ? (
            /* Relay Success */
            <div className="flex flex-col items-center justify-center text-center p-6 md:p-8">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4">
                <CheckCircle2 className="h-12 w-12 md:h-16 md:w-16 text-green-600 dark:text-green-500" />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold mb-2">
                Relay Successful!
              </h3>
              <p className="text-sm md:text-base text-muted-foreground max-w-md">
                Your verification has been bridged to Base. You can now create
                distributions.
              </p>
            </div>
          ) : (
            /* Relay Interface */
            <div className="space-y-6">
              {/* Info Alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm space-y-2">
                  <p>
                    <strong>What's happening:</strong> We're using Hyperlane to
                    bridge your verification from Celo to Base.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <strong>Cost:</strong> ~0.01 ETH (~$1) for Hyperlane
                      message fee
                    </li>
                    <li>
                      <strong>Time:</strong> 30-60 seconds for delivery
                    </li>
                    <li>
                      <strong>Required:</strong> Only needed once per Base
                      distribution
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Progress Display */}
              {isRelaying && (
                <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-sm font-medium">{getStepMessage()}</p>
                  </div>

                  {txHash && (
                    <div className="text-center">
                      <a
                        href={`https://sepolia.celoscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                      >
                        View on Celoscan
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {relayStep === "polling" && (
                    <div className="text-center text-xs text-muted-foreground">
                      <p>
                        Hyperlane is delivering your verification to Base...
                      </p>
                      <p className="mt-1">This usually takes 30-60 seconds</p>
                    </div>
                  )}
                </div>
              )}

              {/* Error Display */}
              {relayError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {relayError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              {!isRelaying && (
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleRelay}
                    disabled={isRelaying}
                    size="lg"
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Relay to Base (~0.01 ETH)
                  </Button>

                  <Button
                    onClick={handleSkip}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Skip (Relay manually later)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col md:flex-row gap-3 md:justify-between">
        <Button
          onClick={onBack}
          variant="outline"
          size="lg"
          disabled={isRelaying}
          className="w-full md:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        {!relaySuccess && (
          <Button
            onClick={onNext}
            disabled={isRelaying}
            variant="ghost"
            size="lg"
            className="w-full md:w-auto"
          >
            Continue Without Relaying
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
