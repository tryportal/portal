"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type NotificationPermissionState = "default" | "granted" | "denied";

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

interface UseNotificationsReturn {
  permission: NotificationPermissionState;
  isSupported: boolean;
  requestPermission: () => Promise<NotificationPermissionState>;
  showNotification: (options: NotificationOptions) => void;
  isTabVisible: boolean;
}

// Storage key for tracking dismissed prompts
const PROMPT_DISMISSED_KEY = "portal-notification-prompt-dismissed";
const PROMPT_DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useNotifications(): UseNotificationsReturn {
  const router = useRouter();
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);

  // Check if notifications are supported
  useEffect(() => {
    const supported = typeof window !== "undefined" && "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as NotificationPermissionState);
    }
  }, []);

  // Register service worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        serviceWorkerRef.current = registration;
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    registerServiceWorker();

    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICK") {
        const url = event.data.url;
        if (url && url.startsWith("/")) {
          router.push(url);
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [router]);

  // Track tab visibility
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    setIsTabVisible(!document.hidden);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (!isSupported) {
      return "denied";
    }

    try {
      const result = await Notification.requestPermission();
      const permissionState = result as NotificationPermissionState;
      setPermission(permissionState);
      return permissionState;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  }, [isSupported]);

  // Show a notification
  const showNotification = useCallback(
    (options: NotificationOptions) => {
      if (!isSupported || permission !== "granted") {
        return;
      }

      const notificationOptions: NotificationOptions & { data?: { url: string } } = {
        ...options,
        icon: options.icon || "/portal.svg",
        tag: options.tag || `portal-${Date.now()}`,
      };

      // If service worker is available, use it to show notifications
      // This allows notifications to work even when the tab is in background
      if (serviceWorkerRef.current?.active) {
        serviceWorkerRef.current.active.postMessage({
          type: "SHOW_NOTIFICATION",
          title: options.title,
          options: {
            body: options.body,
            icon: notificationOptions.icon,
            tag: notificationOptions.tag,
            requireInteraction: options.requireInteraction || false,
            data: {
              url: options.url || "/",
            },
          },
        });
      } else {
        // Fallback to regular Notification API
        try {
          const notification = new Notification(options.title, {
            body: options.body,
            icon: notificationOptions.icon,
            tag: notificationOptions.tag,
            requireInteraction: options.requireInteraction,
          });

          notification.onclick = () => {
            window.focus();
            if (options.url) {
              router.push(options.url);
            }
            notification.close();
          };
        } catch (error) {
          console.error("Error showing notification:", error);
        }
      }
    },
    [isSupported, permission, router]
  );

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    isTabVisible,
  };
}

// Helper functions for prompt dismissal persistence
export function wasPromptDismissedRecently(): boolean {
  if (typeof localStorage === "undefined") return false;

  const dismissedAt = localStorage.getItem(PROMPT_DISMISSED_KEY);
  if (!dismissedAt) return false;

  const dismissedTime = parseInt(dismissedAt, 10);
  const now = Date.now();

  return now - dismissedTime < PROMPT_DISMISSED_DURATION;
}

export function markPromptDismissed(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PROMPT_DISMISSED_KEY, Date.now().toString());
}

export function clearPromptDismissal(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(PROMPT_DISMISSED_KEY);
}
