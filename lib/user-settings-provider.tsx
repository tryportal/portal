"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type Density = "compact" | "default" | "spacious";
type MessageDisplay = "default" | "compact";

interface UserSettings {
    density: Density;
    messageDisplay: MessageDisplay;
    groupSpacing: number;
    fontScaling: number;
    zoomLevel: number;
}

interface UserSettingsContextValue extends UserSettings {
    isLoading: boolean;
    updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

const UserSettingsContext = React.createContext<UserSettingsContextValue | undefined>(undefined);

const DEFAULT_SETTINGS: UserSettings = {
    density: "default",
    messageDisplay: "default",
    groupSpacing: 16,
    fontScaling: 16,
    zoomLevel: 100,
};

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
    const { user, isLoaded: userLoaded } = useUser();
    const savedSettings = useQuery(
        api.userSettings.get,
        user?.id ? { userId: user.id } : "skip"
    );

    const settings = React.useMemo(() => {
        if (!savedSettings) return DEFAULT_SETTINGS;
        return {
            density: (savedSettings.density as Density) || "default",
            messageDisplay: (savedSettings.messageDisplay as MessageDisplay) || "default",
            groupSpacing: savedSettings.groupSpacing ?? 16,
            fontScaling: savedSettings.fontScaling ?? 16,
            zoomLevel: savedSettings.zoomLevel ?? 100,
        };
    }, [savedSettings]);

    const applySettings = React.useCallback((s: UserSettings) => {
        if (typeof window === "undefined") return;

        const root = document.documentElement;

        // Apply Density classes
        root.classList.remove("density-compact", "density-default", "density-spacious");
        root.classList.add(`density-${s.density}`);

        // Apply CSS Variables
        root.style.setProperty("--chat-font-scaling", `${s.fontScaling}px`);
        root.style.setProperty("--message-group-spacing", `${s.groupSpacing}px`);
        root.style.setProperty("--app-zoom", `${s.zoomLevel}%`);
    }, []);

    React.useEffect(() => {
        applySettings(settings);
    }, [settings, applySettings]);

    const updateSettingsMutation = useMutation(api.userSettings.update);

    const updateSettings = React.useCallback(async (updates: Partial<UserSettings>) => {
        if (!user?.id) return;
        // The query will automatically refresh since it's a mutation
        await updateSettingsMutation({
            density: updates.density,
            messageDisplay: updates.messageDisplay,
            groupSpacing: updates.groupSpacing,
            fontScaling: updates.fontScaling,
            zoomLevel: updates.zoomLevel,
            userId: user.id
        });
    }, [user, updateSettingsMutation]);

    const value = React.useMemo(
        () => ({
            ...settings,
            isLoading: !userLoaded || (!!user?.id && savedSettings === undefined),
            updateSettings,
        }),
        [settings, userLoaded, user?.id, savedSettings, updateSettings]
    );

    return (
        <UserSettingsContext.Provider value={value}>
            <style dangerouslySetInnerHTML={{
                __html: `
          :root {
            --chat-font-scaling: ${settings.fontScaling}px;
            --message-group-spacing: ${settings.groupSpacing}px;
            --app-zoom: ${settings.zoomLevel}%;
          }
          
          /* Apply Zoom */
          body {
            zoom: var(--app-zoom);
            -moz-transform: scale(calc(var(--app-zoom) / 100));
            -moz-transform-origin: 0 0;
          }

          /* Density specific adjustments could be added here or via tailwind classes on root */
          .density-compact {
            --sidebar-width: 240px;
          }
          .density-default {
            --sidebar-width: 280px;
          }
          .density-spacious {
            --sidebar-width: 320px;
          }
        `
            }} />
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
