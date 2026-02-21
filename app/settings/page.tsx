"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { useTheme } from "next-themes";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, Sun, Moon, Monitor, Bell, BellSlash } from "@phosphor-icons/react";
import { WorkspaceIcon } from "@/components/workspace-icon";
import { DotLoader } from "@/components/ui/dot-loader";
import { useState, useEffect, useCallback } from "react";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const { theme, setTheme } = useTheme();
  const currentUser = useQuery(api.users.currentUser);
  const workspaces = useQuery(api.organizations.getUserWorkspaces);
  const setPrimaryWorkspace = useMutation(api.users.setPrimaryWorkspace);
  const setNotificationsEnabled = useMutation(
    api.users.setNotificationsEnabled
  );

  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission("unsupported");
    }
  }, []);

  const handleToggleNotifications = useCallback(async () => {
    if (!currentUser) return;

    if (currentUser.notificationsEnabled) {
      // Disable
      await setNotificationsEnabled({ enabled: false });
    } else {
      // Enable - request browser permission if needed
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission !== "granted"
      ) {
        const result = await Notification.requestPermission();
        setBrowserPermission(result);
        if (result !== "granted") return;
      }
      await setNotificationsEnabled({ enabled: true });
    }
  }, [currentUser, setNotificationsEnabled]);

  if (!user || !currentUser) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <DotLoader />
      </div>
    );
  }

  const fullName =
    [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") ||
    user.fullName ||
    "User";

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10">
      {/* Account tab header */}
      <h1 className="text-sm font-bold">Account</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Manage your profile and preferences
      </p>

      <Separator className="my-6" />

      {/* Profile section */}
      <div className="flex items-center gap-4">
        <img
          src={user.imageUrl}
          alt={fullName}
          className="size-16 object-cover"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold">{fullName}</span>
          <span className="text-xs text-muted-foreground">
            {currentUser.email}
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => openUserProfile()}
      >
        Manage Account
      </Button>

      <Separator className="my-6" />

      {/* Default workspace section */}
      <div>
        <h2 className="text-sm font-bold">Default Workspace</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose which workspace opens when you launch Portal
        </p>

        <div className="mt-4 flex flex-col gap-1">
          {workspaces?.map((ws) => {
            if (!ws) return null;
            const isDefault =
              currentUser.primaryWorkspaceId === ws._id;

            return (
              <button
                key={ws._id}
                onClick={() => {
                  if (!isDefault) {
                    setPrimaryWorkspace({
                      workspaceId: ws._id as Id<"organizations">,
                    });
                  }
                }}
                className={`flex items-center gap-3 border px-3 py-2.5 text-left text-xs hover:bg-muted ${
                  isDefault
                    ? "border-foreground bg-muted font-bold"
                    : "border-border"
                }`}
              >
                <WorkspaceIcon
                  logoUrl={ws.logoUrl}
                  name={ws.name}
                  slug={ws.slug}
                  size={20}
                />
                <span className="flex-1 truncate">{ws.name}</span>
                {isDefault && (
                  <Check
                    size={14}
                    weight="bold"
                    className="text-foreground"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Notifications section */}
      <div>
        <h2 className="text-sm font-bold">Notifications</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Get browser notifications when someone mentions you
        </p>

        <div className="mt-4 flex flex-col gap-1">
          {browserPermission === "unsupported" ? (
            <p className="text-xs text-muted-foreground">
              Your browser does not support notifications.
            </p>
          ) : browserPermission === "denied" ? (
            <p className="text-xs text-muted-foreground">
              Notifications are blocked by your browser. Update your browser
              settings to allow notifications for this site.
            </p>
          ) : (
            <>
              <button
                onClick={handleToggleNotifications}
                className={`flex items-center gap-3 border px-3 py-2.5 text-left text-xs hover:bg-muted ${
                  currentUser.notificationsEnabled
                    ? "border-foreground bg-muted font-bold"
                    : "border-border"
                }`}
              >
                <Bell size={16} />
                <span className="flex-1">Enabled</span>
                {currentUser.notificationsEnabled && (
                  <Check
                    size={14}
                    weight="bold"
                    className="text-foreground"
                  />
                )}
              </button>
              <button
                onClick={handleToggleNotifications}
                className={`flex items-center gap-3 border px-3 py-2.5 text-left text-xs hover:bg-muted ${
                  !currentUser.notificationsEnabled
                    ? "border-foreground bg-muted font-bold"
                    : "border-border"
                }`}
              >
                <BellSlash size={16} />
                <span className="flex-1">Disabled</span>
                {!currentUser.notificationsEnabled && (
                  <Check
                    size={14}
                    weight="bold"
                    className="text-foreground"
                  />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Appearance section */}
      <div>
        <h2 className="text-sm font-bold">Appearance</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose your preferred theme
        </p>

        <div className="mt-4 flex flex-col gap-1">
          {themeOptions.map((option) => {
            const isActive = theme === option.value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`flex items-center gap-3 border px-3 py-2.5 text-left text-xs hover:bg-muted ${
                  isActive
                    ? "border-foreground bg-muted font-bold"
                    : "border-border"
                }`}
              >
                <Icon size={16} />
                <span className="flex-1">{option.label}</span>
                {isActive && (
                  <Check
                    size={14}
                    weight="bold"
                    className="text-foreground"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
