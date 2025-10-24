"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Send,
  Info,
} from "lucide-react";
import { useAccount, useWriteContract, useSwitchChain, usePublicClient } from "wagmi";
import { SelfQRcodeWrapper, SelfAppBuilder } from "@selfxyz/qrcode";
import { parseEther } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { config as wagmiConfig } from "@/lib/wagmi-config";
import { getVerificationChainConfig, getChainConfig } from "@/lib/chain-config";
import { celoSepolia, baseSepolia } from "wagmi/chains";

interface VerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetChainId: number;
  onVerificationComplete: () => void;
  alreadyVerifiedOnCelo?: boolean;
}

// Helper to convert Ethereum address to bytes32 for Hyperlane
function addressToBytes32(address: string): `0x${string}` {
  const addr = address.toLowerCase().replace("0x", "");
  return `0x${"0".repeat(24)}${addr}` as `0x${string}`;
}

type ModalStep = "verify" | "relay" | "complete";

export function VerificationModal({
  open,
  onOpenChange,
  targetChainId,
  onVerificationComplete,
  alreadyVerifiedOnCelo = false,
}: VerificationModalProps) {
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: targetChainId });

  const [currentStep, setCurrentStep] = useState<ModalStep>("verify");
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [selfApp, setSelfApp] = useState<any | null>(null);

  // Relay state
  const [isRelaying, setIsRelaying] = useState(false);
  const [relaySuccess, setRelaySuccess] = useState(false);
  const [relayError, setRelayError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [relayStep, setRelayStep] = useState<
    "idle" | "switching" | "sending" | "waiting" | "polling"
  >("idle");

  // Always use Celo for verification
  const celoConfig = getVerificationChainConfig();
  const targetConfig = getChainConfig(targetChainId);
  const needsRelay = targetChainId !== celoSepolia.id;

  const contractAddress = celoConfig.verificationRegistryAddress;
  const chainId = celoConfig.chain.id;
  const scopeSeed = celoConfig.scopeSeed;

  // Reset state when modal opens or props change
  useEffect(() => {
    if (open) {
      const initialStep: ModalStep = alreadyVerifiedOnCelo && needsRelay ? "relay" : "verify";
      setCurrentStep(initialStep);
      setVerificationSuccess(alreadyVerifiedOnCelo);
      setVerificationError(null);
      setRelayError(null);
      setRelaySuccess(false);
      setIsRelaying(false);
      setRelayStep("idle");
    }
  }, [open, alreadyVerifiedOnCelo, needsRelay]);

  // Build Self app config
  useEffect(() => {
    if (!scopeSeed || !contractAddress || !address) return;

    try {
      const app = new SelfAppBuilder({
        version: 2,
        appName: "HumanPay",
        scope: scopeSeed,
        endpoint: contractAddress,
        userId: address as string,
        endpointType: celoConfig.selfEndpointType,
        userIdType: "hex",
        userDefinedData: "Identity verification for HumanPay claim",
        disclosures: {
          minimumAge: 18,
          ofac: true,
        },
      }).build();
      setSelfApp(app);
    } catch (e) {
      console.error("Failed to init Self app", e);
      setVerificationError("Failed to initialize verification");
    }
  }, [scopeSeed, address, contractAddress, celoConfig.selfEndpointType]);

  // Handle verification success
  useEffect(() => {
    if (verificationSuccess) {
      if (needsRelay) {
        // Move to relay step
        setTimeout(() => {
          setCurrentStep("relay");
        }, 1500);
      } else {
        // Complete directly
        setTimeout(() => {
          setCurrentStep("complete");
          onVerificationComplete();
          // Auto-close after showing success
          setTimeout(() => {
            onOpenChange(false);
          }, 2000);
        }, 1500);
      }
    }
  }, [verificationSuccess, needsRelay, onVerificationComplete, onOpenChange]);

  // Poll target chain until verification appears
  const pollTargetChainUntilVerified = async (): Promise<boolean> => {
    const maxAttempts = 60; // 2 minutes max (2 second intervals)
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (!publicClient || !address || !targetConfig?.verificationRegistryAddress) {
          await new Promise((r) => setTimeout(r, pollInterval));
          continue;
        }

        const expiresAt = (await publicClient.readContract({
          address: targetConfig.verificationRegistryAddress,
          abi: targetConfig.verificationRegistryAbi,
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
    if (!address || !targetConfig?.verificationRegistryAddress) {
      setRelayError("Wallet not connected or target registry not found");
      return;
    }

    setIsRelaying(true);
    setRelayError(null);
    setRelayStep("switching");

    try {
      // Step 1: Ensure on Celo Sepolia
      if (chain?.id !== celoSepolia.id) {
        await switchChain?.({ chainId: celoSepolia.id });
        await new Promise((r) => setTimeout(r, 1000));
      }

      // Step 2: Convert recipient registry to bytes32
      const recipientRegistry = addressToBytes32(
        targetConfig.verificationRegistryAddress
      );

      // Step 3: Call relay function
      setRelayStep("sending");
      const hyperlaneDestinationDomain = targetChainId === baseSepolia.id ? 84532 : 0;

      const hash = await writeContractAsync({
        address: celoConfig.verificationRegistryAddress,
        abi: celoConfig.verificationRegistryAbi,
        functionName: "relayVerificationTo",
        args: [hyperlaneDestinationDomain, recipientRegistry, address],
        value: parseEther("0.01"), // Hyperlane fee
        chainId: celoSepolia.id,
      });

      setTxHash(hash);

      // Step 4: Wait for transaction confirmation
      setRelayStep("waiting");
      await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: celoSepolia.id,
      });

      // Step 5: Poll target chain until verification appears
      setRelayStep("polling");
      const verified = await pollTargetChainUntilVerified();

      if (verified) {
        setRelaySuccess(true);
        setCurrentStep("complete");
        onVerificationComplete();

        // Auto-close after showing success
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        setRelayError(
          "Hyperlane delivery timeout. Your verification should appear shortly. You can close this and try claiming again in 2-3 minutes."
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

  const getRelayStepMessage = () => {
    switch (relayStep) {
      case "switching":
        return "Switching to Celo Sepolia...";
      case "sending":
        return "Sending relay transaction...";
      case "waiting":
        return "Waiting for transaction confirmation...";
      case "polling":
        return "Waiting for Hyperlane delivery (30-60s)...";
      default:
        return "";
    }
  };

  const renderContent = () => {
    if (currentStep === "complete") {
      return (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-500" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">
            {needsRelay ? "Verification Relayed!" : "Verification Complete!"}
          </h3>
          <p className="text-muted-foreground">
            {needsRelay
              ? "Your verification has been bridged. You can now claim your tokens."
              : "Your identity has been verified. You can now claim your tokens."}
          </p>
        </div>
      );
    }

    if (currentStep === "relay") {
      return (
        <div className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm space-y-2">
              <p>
                <strong>What's happening:</strong> We're using Hyperlane to
                bridge your verification from Celo to{" "}
                {targetConfig?.chain.name}.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong>Cost:</strong> ~0.01 ETH (~$1) for Hyperlane message
                  fee
                </li>
                <li>
                  <strong>Time:</strong> 30-60 seconds for delivery
                </li>
              </ul>
            </AlertDescription>
          </Alert>

          {isRelaying && (
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm font-medium">{getRelayStepMessage()}</p>
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
                    Hyperlane is delivering your verification to{" "}
                    {targetConfig?.chain.name}...
                  </p>
                  <p className="mt-1">This usually takes 30-60 seconds</p>
                </div>
              )}
            </div>
          )}

          {relayError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{relayError}</AlertDescription>
            </Alert>
          )}

          {!isRelaying && (
            <Button
              onClick={handleRelay}
              disabled={isRelaying}
              size="lg"
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Relay to {targetConfig?.chain.name} (~0.01 ETH)
            </Button>
          )}
        </div>
      );
    }

    // Verify step (default)
    return (
      <div className="space-y-6">
        {verificationSuccess ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">
              Verification Successful!
            </h3>
            <p className="text-muted-foreground">
              {needsRelay
                ? "Now bridging to target chain..."
                : "You can now claim your tokens."}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold">Why verification?</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Prevents bot and sybil attacks</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Ensures compliance with regulations</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Protects recipients and senders</span>
                </li>
              </ul>
            </div>

            {selfApp ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Scan this QR code with your <strong>Self app</strong> to
                    complete verification. This is required once every 30 days.
                  </p>
                  <p>
                    Don't have the app?{" "}
                    <a
                      href="https://self.xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Download here
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>

                <div className="flex justify-center p-6 bg-white dark:bg-muted rounded-lg">
                  <SelfQRcodeWrapper
                    selfApp={selfApp}
                    onSuccess={() => {
                      setVerificationSuccess(true);
                    }}
                    onError={(error) => {
                      console.error("Verification error:", error);
                      setVerificationError(
                        "Verification failed. Please try again."
                      );
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Loading verification QR code...
              </div>
            )}

            {verificationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {verificationError}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {currentStep === "relay"
              ? "Relay Verification"
              : "Verify Your Identity"}
          </DialogTitle>
          <DialogDescription>
            {currentStep === "relay"
              ? "Bridge your verification to claim your tokens"
              : "Prove you're human to claim your airdrop"}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
