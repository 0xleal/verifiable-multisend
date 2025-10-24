"use client";

import { useState, useEffect, useMemo } from "react";
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
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { SelfQRcodeWrapper, SelfAppBuilder } from "@selfxyz/qrcode";
import { getVerificationChainConfig } from "@/lib/chain-config";

interface Step2VerifyProps {
  onNext: () => void;
  onBack: () => void;
}

export function Step2Verify({ onNext, onBack }: Step2VerifyProps) {
  const { address } = useAccount();
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [selfApp, setSelfApp] = useState<any | null>(null);

  // Always use Celo for verification (even if user wants to distribute on Base)
  const verificationConfig = getVerificationChainConfig();
  const contractAddress = verificationConfig.verificationRegistryAddress;
  const chainId = verificationConfig.chain.id;
  const scopeSeed = verificationConfig.scopeSeed;

  const {
    data: isVerified,
    refetch: refetchExpiresAt,
    status: status,
    error: errorReport,
  } = useReadContract({
    address: contractAddress,
    abi: verificationConfig.verificationRegistryAbi,
    functionName: "isVerified",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    chainId,
    query: { enabled: !!contractAddress && !!address },
  } as any);

  // Build Self app config
  useEffect(() => {
    if (!scopeSeed || !contractAddress) return;
    const userId =
      (address as string) || "0x0000000000000000000000000000000000000000";
    try {
      const app = new SelfAppBuilder({
        version: 2,
        appName: "HumanPay",
        scope: scopeSeed,
        endpoint: contractAddress,
        userId,
        endpointType: verificationConfig.selfEndpointType,
        userIdType: "hex",
        userDefinedData: "Sender verification for HumanPay",
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
  }, [
    scopeSeed,
    address,
    contractAddress,
    verificationConfig.selfEndpointType,
  ]);

  const handleNext = () => {
    if (isVerified) {
      onNext();
    }
  };

  // Auto-advance after successful verification
  useEffect(() => {
    if (verificationSuccess) {
      refetchExpiresAt?.();
      // Give user a moment to see the success message, then refetch and advance
      const timer = setTimeout(async () => {
        onNext();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [verificationSuccess, onNext, refetchExpiresAt]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold">Verify Your Identity</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Prove you're human to ensure secure and compliant distributions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Self.xyz Verification
          </CardTitle>
          <CardDescription>
            One-time verification valid for 30 days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isVerified ? (
            /* Already Verified */
            <div className="flex flex-col items-center justify-center text-center p-6 md:p-8">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4">
                <CheckCircle2 className="h-12 w-12 md:h-16 md:w-16 text-green-600 dark:text-green-500" />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold mb-2">
                Already Verified!
              </h3>
              <p className="text-sm md:text-base text-muted-foreground max-w-md">
                Your identity has been verified. You can proceed with the token
                distribution.
              </p>
            </div>
          ) : verificationSuccess ? (
            /* Just Verified */
            <div className="flex flex-col items-center justify-center text-center p-6 md:p-8">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4">
                <CheckCircle2 className="h-12 w-12 md:h-16 md:w-16 text-green-600 dark:text-green-500" />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold mb-2">
                Verification Successful!
              </h3>
              <p className="text-sm md:text-base text-muted-foreground max-w-md">
                Your identity has been verified on-chain. You can now proceed
                with the distribution.
              </p>
            </div>
          ) : (
            /* Need to Verify */
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 md:p-6 space-y-3">
                <h4 className="font-semibold text-sm md:text-base">
                  Why verification?
                </h4>
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
                      complete verification. This is required once every 30
                      days.
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
          className="w-full md:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isVerified && !verificationSuccess}
          size="lg"
          className="w-full md:w-auto"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
