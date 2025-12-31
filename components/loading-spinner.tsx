"use client";

import { CircleNotchIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

export function LoadingSpinner({
  className,
  size = "md",
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullScreen && "h-full w-full",
        className
      )}
    >
      <CircleNotchIcon
        className={cn(
          "animate-spin text-muted-foreground",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        {spinner}
      </div>
    );
  }

  return spinner;
}

