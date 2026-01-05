"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUserSettings } from "@/lib/user-settings";
import { useTheme } from "@/lib/theme-provider";
import { usePageTitle } from "@/lib/use-page-title";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  UserIcon,
  KeyboardIcon,
  ArrowLeftIcon,
  SidebarIcon,
} from "@phosphor-icons/react";

const MODIFIER_OPTIONS = [
  { value: "meta", label: "Cmd/Ctrl" },
  { value: "alt", label: "Alt/Option" },
  { value: "shift", label: "Shift" },
] as const;

const KEY_OPTIONS = "abcdefghijklmnopqrstuvwxyz".split("").map((key) => ({
  value: key,
  label: key.toUpperCase(),
}));

export default function UserSettingsPage() {
  usePageTitle("Settings - Portal");

  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { settings, updateSidebarHotkey, formatHotkey } = useUserSettings();

  // Get user organizations to redirect back
  const userOrgs = useQuery(api.organizations.getUserOrganizations);

  const [selectedModifier, setSelectedModifier] = React.useState(
    settings.sidebarHotkey.modifier
  );
  const [selectedKey, setSelectedKey] = React.useState(
    settings.sidebarHotkey.key
  );
  const [isRecording, setIsRecording] = React.useState(false);

  // Update local state when settings change
  React.useEffect(() => {
    setSelectedModifier(settings.sidebarHotkey.modifier);
    setSelectedKey(settings.sidebarHotkey.key);
  }, [settings.sidebarHotkey]);

  // Handle keyboard shortcut recording
  React.useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

      // Detect modifier
      let modifier: "meta" | "ctrl" | "alt" | "shift" = "meta";
      if (e.metaKey || e.ctrlKey) modifier = "meta";
      else if (e.altKey) modifier = "alt";
      else if (e.shiftKey) modifier = "shift";

      // Get the key (only allow letters)
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) {
        setSelectedModifier(modifier);
        setSelectedKey(key);
        updateSidebarHotkey({ key, modifier });
        setIsRecording(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsRecording(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isRecording, updateSidebarHotkey]);

  const handleBack = () => {
    if (userOrgs && userOrgs.length > 0) {
      router.push(`/w/${userOrgs[0].slug}`);
    } else {
      router.push("/");
    }
  };

  const handleSaveHotkey = () => {
    updateSidebarHotkey({
      key: selectedKey,
      modifier: selectedModifier,
    });
  };

  const hasHotkeyChanges =
    selectedModifier !== settings.sidebarHotkey.modifier ||
    selectedKey !== settings.sidebarHotkey.key;

  if (!userLoaded) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" weight="bold" />
          </Button>
          <Image
            src={isDark ? "/portal-dark-full.svg" : "/portal-full.svg"}
            alt="Portal"
            width={100}
            height={21}
            className="h-5 w-auto"
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl py-8 sm:py-12 px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              User Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your account and preferences
            </p>
          </div>

          <div className="space-y-10">
            {/* Account Section */}
            <section className="space-y-6">
              <div>
                <h2 className="text-base sm:text-lg font-medium text-foreground flex items-center gap-2">
                  <UserIcon className="size-5" weight="fill" />
                  Account
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Your account information
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  {user?.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt={user.fullName || "User"}
                      width={56}
                      height={56}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                      <UserIcon className="size-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.fullName || user?.firstName || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openUserProfile()}
                    className="shrink-0"
                  >
                    Manage Account
                  </Button>
                </div>
              </div>
            </section>

            {/* Keyboard Shortcuts Section */}
            <section className="space-y-6">
              <div>
                <h2 className="text-base sm:text-lg font-medium text-foreground flex items-center gap-2">
                  <KeyboardIcon className="size-5" weight="fill" />
                  Keyboard Shortcuts
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Customize your keyboard shortcuts
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="space-y-6">
                  {/* Sidebar Toggle */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                          <SidebarIcon
                            className="size-4 text-muted-foreground"
                            weight="fill"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">
                            Toggle Sidebar
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Show or hide the sidebar
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                          {formatHotkey(settings.sidebarHotkey)}
                        </kbd>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <Label className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Customize Shortcut
                      </Label>

                      {isRecording ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center justify-center h-10 rounded-md border-2 border-dashed border-primary bg-primary/5 text-sm text-primary animate-pulse">
                            Press a key combination...
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsRecording(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <select
                            value={selectedModifier}
                            onChange={(e) =>
                              setSelectedModifier(
                                e.target.value as typeof selectedModifier
                              )
                            }
                            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {MODIFIER_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <span className="text-muted-foreground">+</span>
                          <select
                            value={selectedKey}
                            onChange={(e) => setSelectedKey(e.target.value)}
                            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {KEY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsRecording(true)}
                            className="text-muted-foreground"
                          >
                            Record
                          </Button>
                          {hasHotkeyChanges && (
                            <Button size="sm" onClick={handleSaveHotkey}>
                              Save
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
