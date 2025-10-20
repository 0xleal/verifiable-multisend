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

  const handleNext = () => {
    onNext({ mode, tokenAddress });
  };

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
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Info className="h-3 w-3" />
                        <span>Coming Soon</span>
                      </div>
                    </div>
                  </div>
                </div>
                {mode === "claim" && (
                  <div className="absolute inset-0 bg-muted/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                    <span className="text-xs font-medium bg-background px-3 py-1.5 rounded-full border">
                      Not yet available
                    </span>
                  </div>
                )}
              </button>
            </div>
          </div>

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
          disabled={mode === "claim"} // Disable if claim mode since it's not implemented
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
