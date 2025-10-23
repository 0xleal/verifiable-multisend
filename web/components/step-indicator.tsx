"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
}: StepIndicatorProps) {
  return (
    <div className="w-full">
      {/* Desktop: Horizontal stepper */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.number);
            const isCurrent = currentStep === step.number;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  {/* Circle */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300",
                      isCompleted &&
                        "bg-primary text-primary-foreground animate-fade-in",
                      isCurrent &&
                        !isCompleted &&
                        "bg-primary/20 text-primary border-2 border-primary scale-110",
                      !isCurrent &&
                        !isCompleted &&
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5 animate-fade-in" />
                    ) : (
                      step.number
                    )}
                  </div>

                  {/* Text */}
                  <div className="mt-2 text-center">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        isCurrent && "text-foreground",
                        !isCurrent && "text-muted-foreground",
                      )}
                    >
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 hidden lg:block">
                      {step.description}
                    </div>
                  </div>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-4 transition-all duration-500",
                      isCompleted ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Compact stepper */}
      <div className="md:hidden">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.number);
            const isCurrent = currentStep === step.number;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center w-full">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-300",
                      isCompleted &&
                        "bg-primary text-primary-foreground animate-fade-in",
                      isCurrent &&
                        !isCompleted &&
                        "bg-primary/20 text-primary border-2 border-primary scale-110",
                      !isCurrent &&
                        !isCompleted &&
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 animate-fade-in" />
                    ) : (
                      step.number
                    )}
                  </div>
                  {isCurrent && (
                    <div className="text-xs font-medium text-center mt-1">
                      {step.title}
                    </div>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 transition-all duration-500",
                      isCompleted ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
