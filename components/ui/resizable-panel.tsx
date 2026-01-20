"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ResizablePanelProps {
  children: React.ReactNode;
  storageKey: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  /** Additional class names for the resize handle */
  handleClassName?: string;
  /** Position of the resize handle: 'left' or 'right' */
  handlePosition?: "left" | "right";
}

export function ResizablePanel({
  children,
  storageKey,
  defaultWidth = 240,
  minWidth = 180,
  maxWidth = 400,
  className,
  handleClassName,
  handlePosition = "right",
}: ResizablePanelProps) {
  // Initialize width from localStorage immediately using lazy initializer
  const [width, setWidth] = React.useState(() => {
    if (typeof window === "undefined") return defaultWidth;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        return parsed;
      }
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const widthRef = React.useRef(width);

  // Keep ref in sync with state
  React.useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // Helper function to safely save to localStorage
  const saveWidth = React.useCallback((value: number) => {
    if (typeof window === "undefined") return;
    try {
      // Ensure value is within bounds before saving
      const clampedValue = Math.max(minWidth, Math.min(maxWidth, value));
      localStorage.setItem(storageKey, clampedValue.toString());
    } catch (error) {
      // localStorage might be disabled or quota exceeded
      console.warn("Failed to save panel width:", error);
    }
  }, [storageKey, minWidth, maxWidth]);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      let newWidth: number;

      if (handlePosition === "right") {
        // Calculate width relative to the panel's left position
        newWidth = e.clientX - rect.left;
      } else {
        // Calculate width relative to the panel's right position
        newWidth = rect.right - e.clientX;
      }

      let finalWidth = newWidth;
      if (newWidth < minWidth) {
        finalWidth = minWidth;
      } else if (newWidth > maxWidth) {
        finalWidth = maxWidth;
      }
      
      if (finalWidth >= minWidth && finalWidth <= maxWidth) {
        setWidth(finalWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Force immediate save on mouseup using the ref to get latest value
      if (typeof window !== "undefined" && panelRef.current) {
        const finalWidth = panelRef.current.getBoundingClientRect().width;
        // Clamp and save
        const clampedWidth = Math.max(minWidth, Math.min(maxWidth, finalWidth));
        saveWidth(clampedWidth);
        // Update state if clamped
        if (clampedWidth !== finalWidth) {
          setWidth(clampedWidth);
        }
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, minWidth, maxWidth, handlePosition, saveWidth]);

  // Save to localStorage whenever width changes and we're not resizing
  // Use a debounced effect to avoid excessive writes during rapid changes
  React.useEffect(() => {
    if (!isResizing && typeof window !== "undefined") {
      // Save immediately when not resizing
      saveWidth(width);
    }
  }, [width, isResizing, saveWidth]);

  // Save on unmount to ensure final state is persisted
  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && widthRef.current) {
        saveWidth(widthRef.current);
      }
    };
  }, [saveWidth]);

  return (
    <div
      ref={panelRef}
      className={cn("relative flex flex-col", className)}
      style={{ width }}
    >
      {children}
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute top-0 h-full w-1 cursor-col-resize group z-10",
          handlePosition === "right" ? "right-0" : "left-0",
          "hover:bg-primary/20 transition-colors",
          isResizing && "bg-primary/30",
          handleClassName
        )}
      >
        {/* Visual indicator line */}
        <div
          className={cn(
            "absolute top-0 h-full w-px bg-transparent transition-colors",
            handlePosition === "right" ? "right-0" : "left-0",
            "group-hover:bg-primary/50",
            isResizing && "bg-primary"
          )}
        />
      </div>
    </div>
  );
}
