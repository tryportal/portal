"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/lib/user-settings";
import { useTheme } from "@/lib/theme-provider";
import { usePageTitle } from "@/lib/use-page-title";
import { LoadingSpinner } from "@/components/loading-spinner";
import { cn } from "@/lib/utils";
import {
  UserIcon,
  KeyboardIcon,
  ArrowLeftIcon,
  SidebarIcon,
  HouseIcon,
  CheckIcon,
  PaletteIcon,
  SunIcon,
  MoonIcon,
  CircleHalfIcon,
  SignOutIcon,
  CaretRightIcon,
  BellIcon,
} from "@phosphor-icons/react";
import { useNotificationContext } from "@/components/notifications/notification-provider";
import type { BrowserNotificationsSetting } from "@/lib/user-settings";

const MODIFIER_OPTIONS = [
  { value: "meta", label: "⌘ Cmd" },
  { value: "alt", label: "⌥ Option" },
  { value: "shift", label: "⇧ Shift" },
] as const;

const KEY_OPTIONS = "abcdefghijklmnopqrstuvwxyz".split("").map((key) => ({
  value: key,
  label: key.toUpperCase(),
}));

type SettingsSection = "account" | "appearance" | "notifications" | "shortcuts";

export default function UserSettingsPage() {
  usePageTitle("Settings - Portal");

  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { settings, updateSidebarHotkey, updateBrowserNotifications, formatHotkey } = useUserSettings();
  const { permission: notificationPermission, isSupported: notificationsSupported, requestPermission } = useNotificationContext();

  // Get user organizations to redirect back
  const userOrgs = useQuery(api.organizations.getUserOrganizations);

  // Primary workspace
  const primaryWorkspace = useQuery(api.users.getPrimaryWorkspace);
  const setPrimaryWorkspace = useMutation(api.users.setPrimaryWorkspace);

  const [activeSection, setActiveSection] = React.useState<SettingsSection>("account");
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
      if (e.key === "Escape") {
        setIsRecording(false);
        return;
      }

      e.preventDefault();

      let modifier: "meta" | "ctrl" | "alt" | "shift" = "meta";
      if (e.metaKey || e.ctrlKey) modifier = "meta";
      else if (e.altKey) modifier = "alt";
      else if (e.shiftKey) modifier = "shift";

      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) {
        setSelectedModifier(modifier);
        setSelectedKey(key);
        updateSidebarHotkey({ key, modifier });
        setIsRecording(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, updateSidebarHotkey]);

  const handleBack = () => {
    if (primaryWorkspace) {
      router.push(`/w/${primaryWorkspace.slug}`);
    } else if (userOrgs && userOrgs.length > 0) {
      router.push(`/w/${userOrgs[0].slug}`);
    } else {
      router.push("/");
    }
  };

  const handleSetPrimaryWorkspace = async (workspaceId: Id<"organizations"> | null) => {
    await setPrimaryWorkspace({ workspaceId });
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

  const sections = [
    { id: "account" as const, label: "Account", icon: UserIcon },
    { id: "appearance" as const, label: "Appearance", icon: PaletteIcon },
    { id: "notifications" as const, label: "Notifications", icon: BellIcon },
    { id: "shortcuts" as const, label: "Shortcuts", icon: KeyboardIcon },
  ];

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
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="hidden sm:flex w-56 shrink-0 flex-col border-r border-border bg-background">
          <div className="p-4">
            <h1 className="text-lg font-semibold text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your preferences
            </p>
          </div>
          <nav className="flex-1 px-2 pb-4">
            <div className="space-y-0.5">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" weight={isActive ? "fill" : "regular"} />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Sign Out */}
          <div className="border-t border-border p-2">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <SignOutIcon className="size-4" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Mobile section selector */}
        <div className="sm:hidden border-b border-border bg-background">
          <div className="flex gap-1 p-2 overflow-x-auto">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-4" weight={isActive ? "fill" : "regular"} />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl py-6 sm:py-10 px-4 sm:px-8">
            {/* Account Section */}
            {activeSection === "account" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Account</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your profile and workspace preferences
                  </p>
                </div>

                {/* Profile Card */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-4">
                      {user?.imageUrl ? (
                        <Image
                          src={user.imageUrl}
                          alt={user.fullName || "User"}
                          width={64}
                          height={64}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                          <UserIcon className="size-7 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-foreground truncate">
                          {user?.fullName || user?.firstName || "User"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user?.primaryEmailAddress?.emailAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border bg-muted/30 px-5 sm:px-6 py-3">
                    <button
                      onClick={() => openUserProfile()}
                      className="flex w-full items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      <span>Manage account</span>
                      <CaretRightIcon className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Primary Workspace */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <HouseIcon className="size-4" weight="fill" />
                      Default Workspace
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose where to go when you open Portal
                    </p>
                  </div>

                  <div className="space-y-2">
                    {userOrgs && userOrgs.length > 0 ? (
                      <>
                        {/* None option */}
                        <button
                          onClick={() => handleSetPrimaryWorkspace(null)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                            !primaryWorkspace
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border bg-card hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "flex size-10 items-center justify-center rounded-lg",
                            !primaryWorkspace ? "bg-primary/10" : "bg-muted"
                          )}>
                            <HouseIcon
                              className={cn(
                                "size-5",
                                !primaryWorkspace ? "text-primary" : "text-muted-foreground"
                              )}
                              weight={!primaryWorkspace ? "fill" : "regular"}
                            />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-foreground">
                              First available
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Opens the first workspace in your list
                            </p>
                          </div>
                          {!primaryWorkspace && (
                            <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                              <CheckIcon className="size-3 text-primary-foreground" weight="bold" />
                            </div>
                          )}
                        </button>

                        {/* Workspace options */}
                        {userOrgs.map((org) => {
                          const isPrimary = primaryWorkspace?._id === org._id;
                          return (
                            <button
                              key={org._id}
                              onClick={() => handleSetPrimaryWorkspace(org._id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                                isPrimary
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                  : "border-border bg-card hover:bg-muted/50"
                              )}
                            >
                              {org.logoUrl ? (
                                <Image
                                  src={org.logoUrl}
                                  alt={org.name || "Organization"}
                                  width={40}
                                  height={40}
                                  className="rounded-lg"
                                />
                              ) : (
                                <div className="flex size-10 items-center justify-center rounded-lg bg-foreground">
                                  <Image
                                    src={isDark ? "/portal.svg" : "/portal-dark.svg"}
                                    alt="Workspace"
                                    width={20}
                                    height={20}
                                  />
                                </div>
                              )}
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {org.name || "Organization"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  tryportal.app/w/{org.slug}
                                </p>
                              </div>
                              {isPrimary && (
                                <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                                  <CheckIcon className="size-3 text-primary-foreground" weight="bold" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </>
                    ) : (
                      <div className="rounded-xl border border-border bg-card p-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          No workspaces available
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === "appearance" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customize how Portal looks on your device
                  </p>
                </div>

                {/* Theme Selection */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-4">Theme</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "light", label: "Light", icon: SunIcon },
                      { value: "dark", label: "Dark", icon: MoonIcon },
                      { value: "system", label: "System", icon: CircleHalfIcon },
                    ].map((option) => {
                      const Icon = option.icon;
                      const isSelected = theme === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border bg-card hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "flex size-10 items-center justify-center rounded-lg",
                            isSelected ? "bg-primary/10" : "bg-muted"
                          )}>
                            <Icon
                              className={cn(
                                "size-5",
                                isSelected ? "text-primary" : "text-muted-foreground"
                              )}
                              weight={isSelected ? "fill" : "regular"}
                            />
                          </div>
                          <span className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {option.label}
                          </span>
                          {isSelected && (
                            <div className="flex size-4 items-center justify-center rounded-full bg-primary">
                              <CheckIcon className="size-2.5 text-primary-foreground" weight="bold" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Control how Portal sends you notifications
                  </p>
                </div>

                {/* Browser Notifications */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-4">Browser Notifications</h3>
                  <div className="space-y-2">
                    {(
                      [
                        {
                          value: "enabled",
                          label: "Enabled",
                          description: "Receive notifications for mentions and direct messages",
                        },
                        {
                          value: "disabled",
                          label: "Disabled",
                          description: "Never show notification prompts or send notifications",
                        },
                      ] as const
                    ).map((option) => {
                      const isSelected = settings.browserNotifications === option.value ||
                        (option.value === "enabled" && settings.browserNotifications === "ask" && notificationPermission === "granted") ||
                        (option.value === "disabled" && notificationPermission === "denied");
                      const isDisabledByBrowser = notificationPermission === "denied" && option.value === "enabled";
                      return (
                        <button
                          key={option.value}
                          onClick={async () => {
                            if (isDisabledByBrowser) return;
                            if (option.value === "enabled" && notificationPermission === "default") {
                              const result = await requestPermission();
                              if (result === "granted") {
                                updateBrowserNotifications("enabled");
                              }
                            } else {
                              updateBrowserNotifications(option.value);
                            }
                          }}
                          disabled={isDisabledByBrowser}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border bg-card hover:bg-muted/50",
                            isDisabledByBrowser && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className={cn(
                            "flex size-10 items-center justify-center rounded-lg",
                            isSelected ? "bg-primary/10" : "bg-muted"
                          )}>
                            <BellIcon
                              className={cn(
                                "size-5",
                                isSelected ? "text-primary" : "text-muted-foreground"
                              )}
                              weight={isSelected ? "fill" : "regular"}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {option.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isDisabledByBrowser
                                ? "Blocked in browser settings"
                                : option.description}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                              <CheckIcon className="size-3 text-primary-foreground" weight="bold" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Info box */}
                {notificationPermission === "denied" && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">
                      <strong className="font-medium text-foreground">Note:</strong> Browser notifications are currently blocked. To enable them, update your browser&apos;s notification settings for this site.
                    </p>
                  </div>
                )}

                {!notificationsSupported && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">
                      <strong className="font-medium text-foreground">Note:</strong> Your browser doesn&apos;t support notifications.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Shortcuts Section */}
            {activeSection === "shortcuts" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customize your keyboard shortcuts for faster navigation
                  </p>
                </div>

                {/* Sidebar Toggle Shortcut */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <SidebarIcon className="size-5 text-muted-foreground" weight="fill" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-medium text-foreground">
                              Toggle Sidebar
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Show or hide the navigation sidebar
                            </p>
                          </div>
                          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
                            {formatHotkey(settings.sidebarHotkey)}
                          </kbd>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border">
                          {isRecording ? (
                            <div className="flex items-center gap-3">
                              <div className="flex-1 flex items-center justify-center h-10 rounded-lg border-2 border-dashed border-primary bg-primary/5 text-sm text-primary">
                                <span className="animate-pulse">Press a key combination...</span>
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
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={selectedModifier}
                                onChange={(e) => {
                                  setSelectedModifier(e.target.value as typeof selectedModifier);
                                  updateSidebarHotkey({
                                    key: selectedKey,
                                    modifier: e.target.value as typeof selectedModifier,
                                  });
                                }}
                                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                {MODIFIER_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <span className="text-muted-foreground text-sm">+</span>
                              <select
                                value={selectedKey}
                                onChange={(e) => {
                                  setSelectedKey(e.target.value);
                                  updateSidebarHotkey({
                                    key: e.target.value,
                                    modifier: selectedModifier,
                                  });
                                }}
                                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                {KEY_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <div className="flex-1" />
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsRecording(true)}
                              >
                                <KeyboardIcon className="size-4 mr-1.5" />
                                Record
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shortcut hints */}
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    <strong className="font-medium text-foreground">Tip:</strong> Click "Record" and press your preferred key combination to quickly set a shortcut. Press Escape to cancel.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
