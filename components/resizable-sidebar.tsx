"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Navbar icon width on desktop: 56px (w-14)
// Snap points align with icon right edges: 56 * N
const ICON_WIDTH = 56;
const MIN_SNAPS = 3; // minimum 168px
const MAX_SNAPS = 7; // maximum 392px
const DEFAULT_SNAPS = 5; // default 280px

const SNAP_POINTS = Array.from(
  { length: MAX_SNAPS - MIN_SNAPS + 1 },
  (_, i) => (MIN_SNAPS + i) * ICON_WIDTH
);

// How close (in px) the cursor needs to be for the sidebar to snap
const SNAP_THRESHOLD = 14;

function snapWidth(raw: number): number {
  for (const snap of SNAP_POINTS) {
    if (Math.abs(raw - snap) <= SNAP_THRESHOLD) return snap;
  }
  // Clamp within bounds
  return Math.max(SNAP_POINTS[0], Math.min(SNAP_POINTS[SNAP_POINTS.length - 1], raw));
}

function nearestSnap(width: number): number {
  let closest = SNAP_POINTS[0];
  let minDist = Math.abs(width - closest);
  for (const snap of SNAP_POINTS) {
    const dist = Math.abs(width - snap);
    if (dist < minDist) {
      minDist = dist;
      closest = snap;
    }
  }
  return closest;
}

interface ResizableSidebarProps {
  children: React.ReactNode;
  storageKey: string;
  defaultWidth?: number;
  className?: string;
}

export function ResizableSidebar({
  children,
  storageKey,
  defaultWidth = DEFAULT_SNAPS * ICON_WIDTH,
  className = "",
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return defaultWidth;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) return nearestSnap(parsed);
    }
    return defaultWidth;
  });

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const raw = startWidth.current + delta;
      setWidth(snapWidth(raw));
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      setWidth((current) => {
        const snapped = nearestSnap(current);
        localStorage.setItem(storageKey, String(snapped));
        return snapped;
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [storageKey]);

  return (
    <div
      className={`relative flex h-full shrink-0 ${className}`}
      style={{ width, transition: isDragging.current ? undefined : "width 0.15s ease-out" }}
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        {children}
      </div>
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize group"
      >
        <div className="absolute right-[3px] top-0 h-full w-[2px] opacity-0 bg-foreground/20 transition-opacity group-hover:opacity-100" />
      </div>
    </div>
  );
}
