"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface WorkspaceIconProps {
  name: string;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-16 w-16",
};

const textSizeClasses = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-[10px]",
  lg: "text-sm",
  xl: "text-2xl",
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function WorkspaceIcon({
  name,
  logoUrl,
  size = "md",
  className,
}: WorkspaceIconProps) {
  const initials = getInitials(name || "W");
  const sizeClass = sizeClasses[size];
  const textSizeClass = textSizeClasses[size];

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={name || "Workspace"}
        width={32}
        height={32}
        className={cn(sizeClass, "rounded object-cover shrink-0", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "flex items-center justify-center rounded bg-primary shrink-0",
        className
      )}
    >
      <span className={cn(textSizeClass, "font-semibold text-primary-foreground")}>
        {initials}
      </span>
    </div>
  );
}
