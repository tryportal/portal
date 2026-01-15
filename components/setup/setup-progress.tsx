"use client";

import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SetupProgressProps {
  currentStep: number;
  steps: { id: string; label: string }[];
}

export function SetupProgress({ currentStep, steps }: SetupProgressProps) {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="flex items-center gap-0">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step indicator */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "relative size-9 rounded-full flex items-center justify-center transition-all duration-200",
                    isActive || isCompleted
                      ? "bg-primary"
                      : "bg-muted",
                    isActive && "ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                  )}
                >
                  {/* Check icon for completed */}
                  {isCompleted ? (
                    <Check
                      weight="bold"
                      className="size-4 text-primary-foreground"
                    />
                  ) : (
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    "text-xs hidden sm:block whitespace-nowrap transition-colors duration-200",
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="relative w-12 sm:w-20 h-0.5 mx-2 sm:mx-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300",
                      isCompleted ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
