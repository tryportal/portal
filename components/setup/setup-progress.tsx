"use client";

import { motion } from "framer-motion";
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
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isActive || isCompleted 
                      ? "var(--primary)" 
                      : "var(--muted)",
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 25 
                  }}
                  className={cn(
                    "relative size-9 rounded-full flex items-center justify-center",
                    "transition-shadow duration-300",
                    isActive && "shadow-md shadow-primary/20"
                  )}
                >
                  {/* Check icon for completed */}
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 15,
                        delay: 0.1
                      }}
                    >
                      <Check 
                        weight="bold" 
                        className="size-4 text-primary-foreground" 
                      />
                    </motion.div>
                  ) : (
                    <motion.span
                      initial={false}
                      animate={{
                        color: isActive 
                          ? "var(--primary-foreground)" 
                          : "var(--muted-foreground)",
                      }}
                      className="text-xs font-semibold"
                    >
                      {index + 1}
                    </motion.span>
                  )}

                  {/* Active ring animation */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 rounded-full ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                    />
                  )}
                </motion.div>

                {/* Step label */}
                <motion.span
                  initial={false}
                  animate={{
                    color: isActive 
                      ? "var(--foreground)" 
                      : isCompleted 
                        ? "var(--muted-foreground)" 
                        : "var(--muted-foreground)",
                    fontWeight: isActive ? 500 : 400,
                  }}
                  className="text-xs hidden sm:block whitespace-nowrap"
                >
                  {step.label}
                </motion.span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="relative w-12 sm:w-20 h-0.5 mx-2 sm:mx-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: isCompleted ? "100%" : "0%" 
                    }}
                    transition={{ 
                      duration: 0.4, 
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.1
                    }}
                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
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
