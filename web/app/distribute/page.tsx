"use client";

import { useState } from "react";
import Link from "next/link";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { Coins, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { Step1Upload } from "@/components/wizard-steps/step1-upload";
import { Step2Verify } from "@/components/wizard-steps/step2-verify";
import {
  Step3Configure,
  type DistributionConfig,
} from "@/components/wizard-steps/step3-configure";
import { Step4Review } from "@/components/wizard-steps/step4-review";
import type { RecipientData } from "@/components/csv-upload";

const STEPS = [
  {
    number: 1,
    title: "Upload",
    description: "Add recipients",
  },
  {
    number: 2,
    title: "Verify",
    description: "Prove identity",
  },
  {
    number: 3,
    title: "Configure",
    description: "Set options",
  },
  {
    number: 4,
    title: "Execute",
    description: "Review & send",
  },
];

export default function DistributePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [recipients, setRecipients] = useState<RecipientData[]>([]);
  const [config, setConfig] = useState<DistributionConfig>({
    mode: "send",
    tokenAddress: "",
  });
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animationKey, setAnimationKey] = useState(0);

  const goToStep = (step: number, dir: "forward" | "back") => {
    setDirection(dir);
    setAnimationKey((prev) => prev + 1);
    setCurrentStep(step);
  };

  const handleStep1Next = (data: RecipientData[]) => {
    setRecipients(data);
    setCompletedSteps((prev) => [...new Set([...prev, 1])]);
    goToStep(2, "forward");
  };

  const handleStep2Next = () => {
    setCompletedSteps((prev) => [...new Set([...prev, 2])]);
    goToStep(3, "forward");
  };

  const handleStep3Next = (distributionConfig: DistributionConfig) => {
    setConfig(distributionConfig);
    setCompletedSteps((prev) => [...new Set([...prev, 3])]);
    goToStep(4, "forward");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Coins className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">HumanPay</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Compliant cross-border payments
              </p>
            </div>
          </div>
          <WalletConnectButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
          {/* Step Indicator */}
          <div className="bg-card border rounded-lg p-4 md:p-6">
            <StepIndicator
              steps={STEPS}
              currentStep={currentStep}
              completedSteps={completedSteps}
            />
          </div>

          {/* Step Content */}
          <div
            key={animationKey}
            className={
              direction === "forward"
                ? "animate-slide-in-right"
                : "animate-slide-in-left"
            }
          >
            {currentStep === 1 && (
              <Step1Upload onNext={handleStep1Next} initialData={recipients} />
            )}
            {currentStep === 2 && (
              <Step2Verify
                onNext={handleStep2Next}
                onBack={() => goToStep(1, "back")}
              />
            )}
            {currentStep === 3 && (
              <Step3Configure
                onNext={handleStep3Next}
                onBack={() => goToStep(2, "back")}
                initialConfig={config}
              />
            )}
            {currentStep === 4 && (
              <Step4Review
                onBack={() => goToStep(3, "back")}
                recipients={recipients}
                distributionConfig={config}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
