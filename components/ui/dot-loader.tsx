"use client";

import { cn } from "@/lib/utils";

interface DotLoaderProps {
  /** Number of squares in the row */
  dotCount?: number;
  /** Size of each square in pixels */
  dotSize?: number;
  /** Gap between squares in pixels */
  gap?: number;
  /** Total cycle duration in ms */
  duration?: number;
  className?: string;
}

const LOADER_COLOR = "#3b82f6";

/**
 * A row of sharp-edged squares with a sequential "wave" blink animation.
 * Each square briefly activates in a rapid left-to-right pulse, then dims
 * as the wave moves on. Crisp and high-frequency -- feels busy, not hanging.
 */
export function DotLoader({
  dotCount = 8,
  dotSize = 5,
  gap = 5,
  duration = 1000,
  className,
}: DotLoaderProps) {
  const stagger = duration / dotCount;

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      role="status"
      aria-label="Loading"
    >
      <div className="flex items-center" style={{ gap }}>
        {Array.from({ length: dotCount }).map((_, i) => (
          <div
            key={i}
            style={{
              width: dotSize,
              height: dotSize,
              backgroundColor: LOADER_COLOR,
              opacity: 0.18,
              animation: `dot-loader-blink ${duration}ms ${i * stagger}ms ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes dot-loader-blink {
          0%, 100% { opacity: 0.18; }
          12% { opacity: 1; }
          36% { opacity: 0.18; }
        }
      `}</style>
    </div>
  );
}
