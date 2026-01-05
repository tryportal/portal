"use client";

import * as React from "react";

export interface HotkeyConfig {
  key: string;
  modifier: "meta" | "ctrl" | "alt" | "shift";
}

interface UserSettings {
  sidebarHotkey: HotkeyConfig;
}

interface UserSettingsContextType {
  settings: UserSettings;
  updateSidebarHotkey: (hotkey: HotkeyConfig) => void;
  resetToDefaults: () => void;
  formatHotkey: (hotkey: HotkeyConfig) => string;
}

const STORAGE_KEY = "portal-user-settings";

// Default hotkey configuration
const DEFAULT_SIDEBAR_HOTKEY: HotkeyConfig = {
  key: "b",
  modifier: "meta", // meta = Cmd on Mac, Ctrl on Windows/Linux
};

const defaultSettings: UserSettings = {
  sidebarHotkey: DEFAULT_SIDEBAR_HOTKEY,
};

const UserSettingsContext = React.createContext<UserSettingsContextType | undefined>(undefined);

function getStoredSettings(): UserSettings {
  if (typeof window === "undefined") return defaultSettings;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultSettings,
        ...parsed,
      };
    }
  } catch {
    // Invalid JSON, return defaults
  }
  return defaultSettings;
}

function saveSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage might be full or disabled
  }
}

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<UserSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Load settings from localStorage on mount
  React.useEffect(() => {
    setSettings(getStoredSettings());
    setIsLoaded(true);
  }, []);

  const updateSidebarHotkey = React.useCallback((hotkey: HotkeyConfig) => {
    setSettings((prev) => {
      const newSettings = { ...prev, sidebarHotkey: hotkey };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const resetToDefaults = React.useCallback(() => {
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
  }, []);

  const formatHotkey = React.useCallback((hotkey: HotkeyConfig) => {
    const isMac = typeof navigator !== "undefined" && navigator.platform?.toLowerCase().includes("mac");

    const modifierSymbols: Record<string, string> = {
      meta: isMac ? "⌘" : "Ctrl",
      ctrl: isMac ? "⌃" : "Ctrl",
      alt: isMac ? "⌥" : "Alt",
      shift: isMac ? "⇧" : "Shift",
    };

    const modifier = modifierSymbols[hotkey.modifier] || hotkey.modifier;
    const key = hotkey.key.toUpperCase();

    return `${modifier}${isMac ? "" : "+"}${key}`;
  }, []);

  // Don't render children until settings are loaded to prevent hydration mismatch
  if (!isLoaded) {
    return null;
  }

  return (
    <UserSettingsContext.Provider
      value={{
        settings,
        updateSidebarHotkey,
        resetToDefaults,
        formatHotkey,
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const context = React.useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error("useUserSettings must be used within a UserSettingsProvider");
  }
  return context;
}

export function useSidebarHotkey() {
  const { settings, formatHotkey } = useUserSettings();
  return {
    hotkey: settings.sidebarHotkey,
    formatted: formatHotkey(settings.sidebarHotkey),
  };
}
