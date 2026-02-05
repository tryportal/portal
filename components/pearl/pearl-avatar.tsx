"use client";

import { cn } from "@/lib/utils";

interface PearlAvatarProps {
  state?: "idle" | "thinking" | "speaking" | "listening";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-16",
};

export function PearlAvatar({ state = "idle", size = "sm", className }: PearlAvatarProps) {
  const isActive = state === "thinking" || state === "speaking" || state === "listening";
  
  return (
    <div
      className={cn(
        "pearl-avatar relative rounded-full overflow-hidden flex-shrink-0",
        sizeClasses[size],
        isActive && "pearl-avatar-active",
        className
      )}
    >
      {/* Outer glow for active states */}
      {isActive && (
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-foreground/20 via-foreground/10 to-foreground/20 blur-sm animate-pulse" />
      )}
      
      {/* Main gradient orb */}
      <div
        className={cn(
          "relative size-full rounded-full",
          isActive ? "pearl-gradient-active" : "pearl-gradient-idle"
        )}
      />
      
      {/* Inner luminosity */}
      <div 
        className={cn(
          "absolute inset-[15%] rounded-full",
          "bg-gradient-to-br from-white/20 via-transparent to-transparent",
          isActive && "animate-pulse"
        )}
      />
      
      {/* Specular highlight */}
      <div 
        className={cn(
          "absolute top-[12%] left-[20%] size-[25%] rounded-full",
          "bg-white/25 blur-[1px]"
        )}
      />
    </div>
  );
}
