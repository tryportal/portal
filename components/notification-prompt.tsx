"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Bell, X } from "@phosphor-icons/react";

const DISMISSED_KEY = "portal-notif-dismissed";

export function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const currentUser = useQuery(api.users.currentUser);
  const setNotificationsEnabled = useMutation(
    api.users.setNotificationsEnabled
  );

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.notificationsEnabled) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    setShow(true);
  }, [currentUser]);

  if (!show) return null;

  const handleEnable = async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await setNotificationsEnabled({ enabled: true });
    }
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 border border-border bg-background px-4 py-3 shadow-lg max-w-sm">
      <Bell size={18} weight="fill" className="shrink-0 text-foreground" />
      <p className="text-xs text-foreground">
        Enable notifications to get alerted when someone mentions you.
      </p>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button size="xs" onClick={handleEnable}>
          Enable
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={handleDismiss}>
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
