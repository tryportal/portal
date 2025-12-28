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
          "animate-spin text-[#26251E]/40",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-[#26251E]/60">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F7F7F4]">
        {spinner}
      </div>
    );
  }

  return spinner;
}

