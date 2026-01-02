"use client";

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

const borderClasses = {
  sm: "border-[1.5px]",
  md: "border-2",
  lg: "border-2",
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
      <div
        className={cn(
          "animate-spin rounded-full border-muted-foreground/20 border-t-muted-foreground",
          sizeClasses[size],
          borderClasses[size]
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

