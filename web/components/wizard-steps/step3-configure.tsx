"use client";

import { useState } from "react";
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
import {
  Settings,
  ArrowRight,
  ArrowLeft,
  Send,
  Gift,
  Zap,
  Users,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type DistributionMode = "send" | "claim";
export interface DistributionConfig {
  mode: DistributionMode;
  tokenAddress: string;
  airdropId?: string; // Unique identifier for claim mode
}

interface Step3ConfigureProps {
  onNext: (config: DistributionConfig) => void;
  onBack: () => void;
  initialConfig?: DistributionConfig;
}

export function Step3Configure({
  onNext,
  onBack,
  initialConfig,
}: Step3ConfigureProps) {
  const [mode, setMode] = useState<DistributionMode>(
    initialConfig?.mode || "send"
  );
  const [tokenAddress, setTokenAddress] = useState(
    initialConfig?.tokenAddress || ""
  );
  const [airdropId, setAirdropId] = useState(
    initialConfig?.airdropId || ""
  );

  const handleNext = () => {
    onNext({ mode, tokenAddress, airdropId });
  };

  const isValidAirdropId = (id: string) => {
    return /^[a-z0-9-]+$/.test(id) && id.length >= 3 && id.length <= 50;
  };

  const canProceed = mode === "send" || (mode === "claim" && isValidAirdropId(airdropId));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold">Configure Distribution</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Choose how you want to distribute tokens
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Distribution Settings
          </CardTitle>
          <CardDescription>
            Select your preferred distribution method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Distribution Mode</Label>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Send Mode */}
              <button
                onClick={() => setMode("send")}
                className={cn(
                  "relative p-4 md:p-6 rounded-lg border-2 transition-all text-left",
                  "hover:border-primary/50 hover:shadow-sm",
                  mode === "send"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "rounded-full p-2 transition-colors",
                      mode === "send"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Send className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold flex items-center gap-2">
                      Send
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Instant batch transfer. You pay all gas fees.
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Zap className="h-3 w-3" />
                        <span>Gas Efficient</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <Users className="h-3 w-3" />
                        <span>No action needed from recipients</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Claim Mode */}
              <button
                onClick={() => setMode("claim")}
                className={cn(
                  "relative p-4 md:p-6 rounded-lg border-2 transition-all text-left",
                  "hover:border-primary/50 hover:shadow-sm",
                  mode === "claim"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "rounded-full p-2 transition-colors",
                      mode === "claim"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Gift className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold">Claim</div>
                    <p className="text-sm text-muted-foreground">
                      Recipients claim individually. They pay gas fees.
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                        <Info className="h-3 w-3" />
                        <span>Self-Verified Claims</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Airdrop ID - only for claim mode */}
          {mode === "claim" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="airdrop-id" className="text-base font-semibold">
                  Airdrop Identifier <span className="text-destructive">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Unique name for your airdrop (lowercase, numbers, hyphens only)
                </p>
              </div>
              <Input
                id="airdrop-id"
                placeholder="e.g., talent-q1-2025"
                value={airdropId}
                onChange={(e) => setAirdropId(e.target.value.toLowerCase())}
                className="font-mono text-sm"
                maxLength={50}
              />
              {airdropId && !isValidAirdropId(airdropId) && (
                <p className="text-sm text-destructive">
                  Must be 3-50 characters, lowercase letters, numbers, and hyphens only
                </p>
              )}
              {airdropId && isValidAirdropId(airdropId) && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Claim URL will be: {window.location.origin}/claim/{airdropId}
                </p>
              )}
            </div>
          )}

          {/* Token Address */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="token-address" className="text-base font-semibold">
                Token Contract Address
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Leave empty to distribute native CELO tokens
              </p>
            </div>
            <Input
              id="token-address"
              placeholder="0x... (Optional)"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {mode === "send" ? (
                <span>
                  With <strong>Send</strong> mode, all transfers happen in a single
                  transaction. You'll pay the gas fees, and recipients receive
                  tokens instantly without any action needed.
                </span>
              ) : (
                <span>
                  With <strong>Claim</strong> mode, you create an airdrop contract.
                  Each recipient must claim their tokens individually and pay their
                  own gas fees.
                </span>
              )}
            </AlertDescription>
          </Alert>
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
          disabled={!canProceed}
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
