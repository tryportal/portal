"use client";

import { cn } from "@/lib/utils";

interface DotLoaderProps {
  /** Number of dots in the row */
  dotCount?: number;
  /** Size of each dot in pixels */
  dotSize?: number;
  /** Gap between dots in pixels */
  gap?: number;
  /** Animation duration in ms */
  duration?: number;
  className?: string;
}

/**
 * A row of dots with a filled square sliding across them, leaving a faded trail.
 * Matches the sharp-cornered design system (no border-radius).
 */
export function DotLoader({
  dotCount = 9,
  dotSize = 5,
  gap = 6,
  duration = 1800,
  className,
}: DotLoaderProps) {
  const totalWidth = dotCount * dotSize + (dotCount - 1) * gap;

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      role="status"
      aria-label="Loading"
    >
      <div
        className="relative"
        style={{ width: totalWidth, height: dotSize }}
      >
        {/* Static dot track */}
        <div className="flex items-center" style={{ gap }}>
          {Array.from({ length: dotCount }).map((_, i) => (
            <div
              key={i}
              className="bg-foreground/[0.08] dark:bg-foreground/[0.12]"
              style={{ width: dotSize, height: dotSize, flexShrink: 0 }}
            />
          ))}
        </div>

        {/* Sliding square with trail */}
        <div
          className="absolute top-0 left-0"
          style={{
            width: totalWidth,
            height: dotSize,
            animation: `dot-loader-slide ${duration}ms ease-in-out infinite`,
          }}
        >
          {/* Trail: 3 squares fading out behind the lead */}
          <div
            className="absolute top-0 bg-foreground/[0.06] dark:bg-foreground/[0.08]"
            style={{
              width: dotSize,
              height: dotSize,
              left: -(dotSize + gap) * 3,
            }}
          />
          <div
            className="absolute top-0 bg-foreground/[0.10] dark:bg-foreground/[0.14]"
            style={{
              width: dotSize,
              height: dotSize,
              left: -(dotSize + gap) * 2,
            }}
          />
          <div
            className="absolute top-0 bg-foreground/[0.18] dark:bg-foreground/[0.22]"
            style={{
              width: dotSize,
              height: dotSize,
              left: -(dotSize + gap),
            }}
          />
          {/* Lead square */}
          <div
            className="absolute top-0 left-0 bg-foreground/40 dark:bg-foreground/50"
            style={{
              width: dotSize,
              height: dotSize,
            }}
          />
        </div>

        <style>{`
          @keyframes dot-loader-slide {
            0% {
              transform: translateX(${-(dotSize + gap) * 2}px);
            }
            100% {
              transform: translateX(${totalWidth + (dotSize + gap) * 2}px);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
