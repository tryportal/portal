"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserSettings } from "@/lib/user-settings";
import { useTheme } from "@/lib/theme-provider";
import { usePageTitle } from "@/lib/use-page-title";
import { analytics } from "@/lib/analytics";
import { LoadingSpinner } from "@/components/loading-spinner";
import { cn } from "@/lib/utils";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
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
  GearIcon,
  ChatCircleIcon,
} from "@phosphor-icons/react";
import { useNotificationContext } from "@/components/notifications/notification-provider";
import type { BrowserNotificationsSetting, MessageStyle } from "@/lib/user-settings";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

const sections = [
  { id: "account" as const, label: "Account", icon: UserIcon },
  { id: "appearance" as const, label: "Appearance", icon: PaletteIcon },
  { id: "notifications" as const, label: "Notifications", icon: BellIcon },
  { id: "shortcuts" as const, label: "Shortcuts", icon: KeyboardIcon },
];

// Mini preview components for message style settings
function CompactPreviewMessage({ 
  name, 
  content, 
  isOwn,
  isGrouped = false 
}: { 
  name: string
  content: string
  isOwn: boolean
  isGrouped?: boolean
}) {
  return (
    <div className="flex gap-1.5 items-start">
      {!isGrouped ? (
        <Avatar className="size-4 flex-shrink-0">
          <AvatarFallback className="bg-muted text-foreground text-[6px] font-medium">
            {name[0]}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-4 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <span className="text-[9px] font-medium text-foreground mr-1">{name}</span>
        )}
        <span className="text-[9px] text-muted-foreground">{content}</span>
      </div>
    </div>
  );
}

function BubblePreviewMessage({ 
  content, 
  isOwn 
}: { 
  content: string
  isOwn: boolean
}) {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "px-2 py-1 rounded-lg text-[9px] max-w-[80%]",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {content}
      </div>
    </div>
  );
}

export default function UserSettingsPage() {
  usePageTitle("Settings - Portal");

  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { settings, updateSidebarHotkey, updateBrowserNotifications, updateMessageStyles, formatHotkey } = useUserSettings();
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

  // Track settings page view on mount
  const trackedRef = React.useRef(false);
  React.useEffect(() => {
    if (!trackedRef.current) {
      analytics.settingsOpened({ section: "account" });
      trackedRef.current = true;
    }
  }, []);

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    analytics.settingsOpened({ section });
  };

  // Update local state when settings change
  React.useEffect(() => {
    setSelectedModifier(settings.sidebarHotkey.modifier);
    setSelectedKey(settings.sidebarHotkey.key);
  }, [settings.sidebarHotkey]);

  // Auto-upgrade "ask" to "enabled" when permission is granted
  React.useEffect(() => {
    if (settings.browserNotifications === "ask" && notificationPermission === "granted") {
      updateBrowserNotifications("enabled");
    }
  }, [settings.browserNotifications, notificationPermission, updateBrowserNotifications]);

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

  if (!userLoaded) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden sm:flex w-64 shrink-0 flex-col border-r border-border bg-background">
          {/* Sidebar Header */}
          <div className="flex h-12 items-center gap-2 border-b border-border px-4">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" weight="bold" />
            </Button>
            <GearIcon className="size-5 text-foreground" weight="fill" />
            <h1 className="text-base font-semibold text-foreground">Settings</h1>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <nav className="p-2">
              <div className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionChange(section.id)}
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
          </ScrollArea>

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

        {/* Mobile Header */}
        <div className="sm:hidden flex flex-col w-full">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" weight="bold" />
            </Button>
            <GearIcon className="size-4 text-foreground" weight="fill" />
            <h1 className="text-sm font-semibold text-foreground">Settings</h1>
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                <SignOutIcon className="size-3.5 mr-1.5" />
                Sign out
              </Button>
            </div>
          </header>

          {/* Mobile Section Tabs */}
          <div className="border-b border-border bg-background overflow-x-auto">
            <div className="flex gap-1 p-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
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
          </div>

          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="py-4 px-3">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* Desktop Content */}
        <main className="hidden sm:flex flex-1 flex-col overflow-hidden">
          {/* Content Header */}
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-6">
            {sections.find(s => s.id === activeSection)?.icon && (
              React.createElement(sections.find(s => s.id === activeSection)!.icon, {
                className: "size-5 text-foreground",
                weight: "fill"
              })
            )}
            <h2 className="text-base font-semibold text-foreground">
              {sections.find(s => s.id === activeSection)?.label}
            </h2>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl py-6 px-4">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  function renderContent() {
    return (
      <>
        {/* Account Section */}
        {activeSection === "account" && (
          <div className="space-y-4">
            {/* Profile Card */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  {user?.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt={user.fullName || "User"}
                      width={48}
                      height={48}
                      className="rounded-full size-12 sm:size-12"
                    />
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <UserIcon className="size-5 text-muted-foreground" />
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
                </div>
              </div>
              <div className="border-t border-border bg-muted/30 px-3 sm:px-4 py-2.5">
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
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <HouseIcon className="size-4 text-muted-foreground" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">Default Workspace</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose where to go when you open Portal
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {userOrgs && userOrgs.length > 0 ? (
                    <>
                      {/* None option */}
                      <button
                        onClick={() => handleSetPrimaryWorkspace(null)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                          !primaryWorkspace
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-background hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "flex size-8 items-center justify-center rounded-md",
                          !primaryWorkspace ? "bg-primary/10" : "bg-muted"
                        )}>
                          <HouseIcon
                            className={cn(
                              "size-4",
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
                              "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                              isPrimary
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : "border-border bg-background hover:bg-muted/50"
                            )}
                          >
                            <WorkspaceIcon
                              name={org.name || "Workspace"}
                              logoUrl={org.logoUrl}
                              size="lg"
                            />
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
                    <div className="rounded-lg border border-border bg-background p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        No workspaces available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appearance Section */}
        {activeSection === "appearance" && (
          <div className="space-y-4">
            {/* Theme Selection */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <PaletteIcon className="size-4 text-muted-foreground" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">Theme</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Customize how Portal looks on your device
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
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
                        onClick={() => {
                          setTheme(option.value as "light" | "dark" | "system");
                          analytics.themeChanged({ theme: option.value as "light" | "dark" | "system" });
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border p-2.5 sm:p-3 transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-background hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "flex size-7 sm:size-8 items-center justify-center rounded-md",
                          isSelected ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Icon
                            className={cn(
                              "size-3.5 sm:size-4",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )}
                            weight={isSelected ? "fill" : "regular"}
                          />
                        </div>
                        <span className={cn(
                          "text-xs font-medium",
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

            {/* Channel Messages Style */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <ChatCircleIcon className="size-4 text-muted-foreground" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">Channel Messages</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose how messages appear in channels
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(["compact", "bubble"] as const).map((style) => {
                    const isSelected = settings.messageStyles.channels === style;
                    return (
                      <button
                        key={style}
                        onClick={() => {
                          updateMessageStyles({
                            ...settings.messageStyles,
                            channels: style,
                          });
                        }}
                        className={cn(
                          "flex flex-col rounded-lg border p-2.5 transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-background hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn(
                            "text-sm font-medium capitalize",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {style}
                          </span>
                          {isSelected && (
                            <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                              <CheckIcon className="size-3 text-primary-foreground" weight="bold" />
                            </div>
                          )}
                        </div>
                        {/* Mini Preview */}
                        <div className="rounded-md border border-border bg-muted/30 p-1.5 space-y-1">
                          {style === "compact" ? (
                            <>
                              <CompactPreviewMessage name="Sarah" content="Hey team!" isOwn={false} />
                              <CompactPreviewMessage name="You" content="Hello!" isOwn={true} isGrouped />
                            </>
                          ) : (
                            <>
                              <BubblePreviewMessage content="Hey team!" isOwn={false} />
                              <BubblePreviewMessage content="Hello!" isOwn={true} />
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Direct Messages Style */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <UserIcon className="size-4 text-muted-foreground" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">Direct Messages</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose how messages appear in DMs
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(["compact", "bubble"] as const).map((style) => {
                    const isSelected = settings.messageStyles.directMessages === style;
                    return (
                      <button
                        key={style}
                        onClick={() => {
                          updateMessageStyles({
                            ...settings.messageStyles,
                            directMessages: style,
                          });
                        }}
                        className={cn(
                          "flex flex-col rounded-lg border p-2.5 transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-background hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn(
                            "text-sm font-medium capitalize",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {style}
                          </span>
                          {isSelected && (
                            <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                              <CheckIcon className="size-3 text-primary-foreground" weight="bold" />
                            </div>
                          )}
                        </div>
                        {/* Mini Preview */}
                        <div className="rounded-md border border-border bg-muted/30 p-1.5 space-y-1">
                          {style === "compact" ? (
                            <>
                              <CompactPreviewMessage name="Alex" content="Hey!" isOwn={false} />
                              <CompactPreviewMessage name="You" content="Hi there!" isOwn={true} isGrouped />
                            </>
                          ) : (
                            <>
                              <BubblePreviewMessage content="Hey!" isOwn={false} />
                              <BubblePreviewMessage content="Hi there!" isOwn={true} />
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Section */}
        {activeSection === "notifications" && (
          <div className="space-y-4">
            {/* Browser Notifications */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <BellIcon className="size-4 text-muted-foreground" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">Browser Notifications</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Control how Portal sends you notifications
                    </p>
                  </div>
                </div>

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
                    const isSelected = settings.browserNotifications === option.value;
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
                              analytics.notificationsEnabled();
                            }
                          } else {
                            updateBrowserNotifications(option.value);
                            if (option.value === "enabled") {
                              analytics.notificationsEnabled();
                            }
                          }
                        }}
                        disabled={isDisabledByBrowser}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-background hover:bg-muted/50",
                          isDisabledByBrowser && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className={cn(
                          "flex size-8 items-center justify-center rounded-md",
                          isSelected ? "bg-primary/10" : "bg-muted"
                        )}>
                          <BellIcon
                            className={cn(
                              "size-4",
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

                {/* Info box */}
                {notificationPermission === "denied" && (
                  <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong className="font-medium text-foreground">Note:</strong> Browser notifications are currently blocked. To enable them, update your browser&apos;s notification settings for this site.
                    </p>
                  </div>
                )}

                {!notificationsSupported && (
                  <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong className="font-medium text-foreground">Note:</strong> Your browser doesn&apos;t support notifications.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shortcuts Section */}
        {activeSection === "shortcuts" && (
          <div className="space-y-4">
            {/* Sidebar Toggle Shortcut */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <SidebarIcon className="size-4 text-muted-foreground" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">
                          Toggle Sidebar
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Show or hide the navigation sidebar
                        </p>
                      </div>
                      <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                        {formatHotkey(settings.sidebarHotkey)}
                      </kbd>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border">
                      {isRecording ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center justify-center h-9 rounded-lg border-2 border-dashed border-primary bg-primary/5 text-sm text-primary">
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
                            className="h-8 rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                            className="h-8 rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="font-medium text-foreground">Tip:</strong> Click "Record" and press your preferred key combination to quickly set a shortcut. Press Escape to cancel.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }
}
