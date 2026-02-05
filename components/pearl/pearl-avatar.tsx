"use client";

import dynamic from "next/dynamic";
import type { PersonaState } from "@/components/ai-elements/persona";
import { cn } from "@/lib/utils";

// Dynamically import Persona to avoid SSR issues with Rive WebGL2
const Persona = dynamic(
  () =>
    import("@/components/ai-elements/persona").then((mod) => ({
      default: mod.Persona,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-full bg-gradient-to-br from-zinc-800 to-zinc-600 dark:from-zinc-300 dark:to-zinc-500 animate-pulse" />
    ),
  }
);

interface PearlAvatarProps {
  state?: PersonaState;
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
  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex-shrink-0",
        sizeClasses[size],
        className
      )}
    >
      <Persona
        state={state}
        variant="obsidian"
        className="size-full"
      />
    </div>
  );
}
