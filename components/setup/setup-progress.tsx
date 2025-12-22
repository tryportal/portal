"use client";

import { cn } from "@/lib/utils";
import { Check } from "@phosphor-icons/react";

interface SetupProgressProps {
  currentStep: number;
  steps: { id: string; label: string }[];
}

export function SetupProgress({ currentStep, steps }: SetupProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "size-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-300",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-primary text-primary-foreground",
                  !isActive && !isCompleted && "bg-primary/10 text-primary/40"
                )}
              >
                {isCompleted ? (
                  <Check weight="bold" className="size-3" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors hidden sm:block",
                  isActive && "text-primary",
                  isCompleted && "text-primary/60",
                  !isActive && !isCompleted && "text-primary/40"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px transition-colors",
                  index < currentStep ? "bg-primary/30" : "bg-primary/10"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
