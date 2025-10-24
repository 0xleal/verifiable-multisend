"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Users,
  ShieldCheck,
  Settings,
  Coins,
  AlertTriangle,
  Clock,
  Network,
} from "lucide-react";
import type { RecipientData } from "./csv-upload";
import type { DistributionConfig } from "./wizard-steps/step3-configure";
import { useAccount, useReadContract } from "wagmi";
import { getVerificationChainConfig, getChainConfig, getNativeCurrencySymbol } from "@/lib/chain-config";

interface DistributionJourneySummaryProps {
  recipients: RecipientData[];
  config: DistributionConfig;
}

export function DistributionJourneySummary({
  recipients,
  config,
}: DistributionJourneySummaryProps) {
  const { address } = useAccount();

  // Always check verification on Celo (the verification source chain)
  const verificationConfig = getVerificationChainConfig();
  const contractAddress = verificationConfig.verificationRegistryAddress;
  const chainId = verificationConfig.chain.id;

  // Get target chain configuration
  const targetChainConfig = getChainConfig(config.chainId);
  const targetChainName = targetChainConfig?.chain.name || "Unknown";
  const nativeCurrency = getNativeCurrencySymbol(config.chainId);

  const { data: expiresAt } = useReadContract({
    address: contractAddress,
    abi: verificationConfig.verificationRegistryAbi,
    functionName: "verificationExpiresAt",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    chainId,
    query: { enabled: !!contractAddress && !!address },
  } as any);

  const verificationInfo = useMemo(() => {
    if (!expiresAt) return { isVerified: false, daysRemaining: 0 };
    const exp = Number(expiresAt as unknown as bigint);
    const now = Math.floor(Date.now() / 1000);
    const isVerified = exp > now;
    const daysRemaining = Math.floor((exp - now) / 86400);
    return { isVerified, daysRemaining };
  }, [expiresAt]);

  const totalAmount = useMemo(() => {
    return recipients.reduce((sum, r) => sum + Number(r.amount), 0);
  }, [recipients]);

  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Your Distribution Journey
        </CardTitle>
        <CardDescription>
          Review your configuration before executing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Recipients */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div className="rounded-full bg-primary/10 p-2 mt-0.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Recipients Added</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="flex items-center justify-between">
                <span>Total recipients:</span>
                <Badge variant="secondary" className="text-xs">
                  {recipients.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Total amount:</span>
                <Badge variant="secondary" className="text-xs">
                  {totalAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 18,
                  })}{" "}
                  {nativeCurrency}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Verification */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div className="rounded-full bg-primary/10 p-2 mt-0.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Identity Verified</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {verificationInfo.isVerified ? (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Expires in{" "}
                    <span className="font-medium">
                      {verificationInfo.daysRemaining} days
                    </span>
                  </span>
                </div>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  Verification required
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Configuration */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div className="rounded-full bg-primary/10 p-2 mt-0.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">
                Distribution Configured
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="flex items-center justify-between">
                <span>Mode:</span>
                <Badge variant="secondary" className="text-xs capitalize">
                  {config.mode}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Token:</span>
                <Badge variant="secondary" className="text-xs">
                  {config.tokenAddress || "Native"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Chain:</span>
                <Badge
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                >
                  <Network className="h-3 w-3" />
                  {targetChainName}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Warning */}
        {verificationInfo.isVerified && verificationInfo.daysRemaining < 7 && (
          <Alert
            variant="destructive"
            className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs text-amber-600 dark:text-amber-400">
              Your verification expires in {verificationInfo.daysRemaining}{" "}
              days. Consider renewing soon.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Coins className="h-4 w-4 text-primary" />
            Ready to Execute
          </div>
          <p className="text-xs text-muted-foreground">
            You're all set to distribute{" "}
            <span className="font-medium text-foreground">
              {totalAmount.toLocaleString(undefined, {
                maximumFractionDigits: 18,
              })}{" "}
              tokens
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {recipients.length}{" "}
              {recipients.length === 1 ? "recipient" : "recipients"}
            </span>{" "}
            on{" "}
            <span className="font-medium text-foreground">
              {targetChainName}
            </span>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
