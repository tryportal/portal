"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ResizableVerticalPanelProps {
  children: React.ReactNode;
  storageKey: string;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  /** Additional class names for the resize handle */
  handleClassName?: string;
}

export function ResizableVerticalPanel({
  children,
  storageKey,
  defaultHeight = 200,
  minHeight = 100,
  maxHeight = 500,
  className,
  handleClassName,
}: ResizableVerticalPanelProps) {
  // Initialize height from localStorage immediately using lazy initializer
  const [height, setHeight] = React.useState(() => {
    if (typeof window === "undefined") return defaultHeight;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= minHeight && parsed <= maxHeight) {
        return parsed;
      }
    }
    return defaultHeight;
  });

  const [isResizing, setIsResizing] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const heightRef = React.useRef(height);

  // Keep ref in sync with state
  React.useEffect(() => {
    heightRef.current = height;
  }, [height]);

  // Helper function to safely save to localStorage
  const saveHeight = React.useCallback((value: number) => {
    if (typeof window === "undefined") return;
    try {
      // Ensure value is within bounds before saving
      const clampedValue = Math.max(minHeight, Math.min(maxHeight, value));
      localStorage.setItem(storageKey, clampedValue.toString());
    } catch (error) {
      // localStorage might be disabled or quota exceeded
      console.warn("Failed to save panel height:", error);
    }
  }, [storageKey, minHeight, maxHeight]);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      // Calculate height relative to the panel's top position
      const newHeight = e.clientY - rect.top;

      let finalHeight = newHeight;
      if (newHeight < minHeight) {
        finalHeight = minHeight;
      } else if (newHeight > maxHeight) {
        finalHeight = maxHeight;
      }
      
      if (finalHeight >= minHeight && finalHeight <= maxHeight) {
        setHeight(finalHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Force immediate save on mouseup using the ref to get latest value
      if (typeof window !== "undefined" && panelRef.current) {
        const finalHeight = panelRef.current.getBoundingClientRect().height;
        // Clamp and save
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, finalHeight));
        saveHeight(clampedHeight);
        // Update state if clamped
        if (clampedHeight !== finalHeight) {
          setHeight(clampedHeight);
        }
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      document.body.style.cursor = "row-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, minHeight, maxHeight, saveHeight]);

  // Save to localStorage whenever height changes and we're not resizing
  React.useEffect(() => {
    if (!isResizing && typeof window !== "undefined") {
      // Save immediately when not resizing
      saveHeight(height);
    }
  }, [height, isResizing, saveHeight]);

  // Save on unmount to ensure final state is persisted
  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && heightRef.current) {
        saveHeight(heightRef.current);
      }
    };
  }, [saveHeight]);

  return (
    <div
      ref={panelRef}
      className={cn("relative flex flex-col shrink-0", className)}
      style={{ height }}
    >
      {children}
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute bottom-0 left-0 w-full h-1 cursor-row-resize group z-10",
          "hover:bg-primary/20 transition-colors",
          isResizing && "bg-primary/30",
          handleClassName
        )}
      >
        {/* Visual indicator line */}
        <div
          className={cn(
            "absolute bottom-0 left-0 w-full h-px bg-transparent transition-colors",
            "group-hover:bg-primary/50",
            isResizing && "bg-primary"
          )}
        />
      </div>
    </div>
  );
}
