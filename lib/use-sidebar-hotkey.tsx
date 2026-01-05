"use client";

import * as React from "react";
import { useUserSettings } from "./user-settings";

interface UseSidebarHotkeyOptions {
  onToggle: () => void;
  enabled?: boolean;
}

export function useSidebarHotkey({ onToggle, enabled = true }: UseSidebarHotkeyOptions) {
  const { settings } = useUserSettings();

  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const { key, modifier } = settings.sidebarHotkey;

      // Check if the correct modifier is pressed
      let modifierPressed = false;
      switch (modifier) {
        case "meta":
          // On Mac, use metaKey (Cmd). On Windows/Linux, use ctrlKey
          modifierPressed = e.metaKey || e.ctrlKey;
          break;
        case "ctrl":
          modifierPressed = e.ctrlKey;
          break;
        case "alt":
          modifierPressed = e.altKey;
          break;
        case "shift":
          modifierPressed = e.shiftKey;
          break;
      }

      // Check if the correct key is pressed (case-insensitive)
      const keyMatches = e.key.toLowerCase() === key.toLowerCase();

      // Only trigger if modifier + key are pressed, and no other modifiers
      // (except for meta which allows ctrl as fallback)
      if (modifierPressed && keyMatches) {
        // Prevent triggering when typing in inputs
        const target = e.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (!isInput) {
          e.preventDefault();
          onToggle();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settings.sidebarHotkey, onToggle, enabled]);
}
