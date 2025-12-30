"use client";

import * as React from "react";
import { Bell, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNotificationContext } from "./notification-provider";
import {
  wasPromptDismissedRecently,
  markPromptDismissed,
} from "@/lib/use-notifications";

interface NotificationPermissionPromptProps {
  /**
   * Optional delay in milliseconds before showing the prompt
   * Defaults to 5000ms (5 seconds)
   */
  delay?: number;
}

export function NotificationPermissionPrompt({
  delay = 5000,
}: NotificationPermissionPromptProps) {
  const { permission, isSupported, requestPermission } = useNotificationContext();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isRequesting, setIsRequesting] = React.useState(false);

  // Determine if we should show the prompt
  React.useEffect(() => {
    // Don't show if not supported or already decided
    if (!isSupported || permission !== "default") {
      return;
    }

    // Don't show if recently dismissed
    if (wasPromptDismissedRecently()) {
      return;
    }

    // Show after delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isSupported, permission, delay]);

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
    } finally {
      setIsRequesting(false);
      setIsOpen(false);
    }
  };

  const handleDismiss = () => {
    markPromptDismissed();
    setIsOpen(false);
  };

  // Don't render anything if not in the "default" state
  if (!isSupported || permission !== "default") {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Enable Notifications</DialogTitle>
          <DialogDescription className="text-center">
            Get notified when someone mentions you or sends you a direct message.
            You can change this anytime in your browser settings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleEnable}
            disabled={isRequesting}
            className="w-full"
          >
            {isRequesting ? "Enabling..." : "Enable Notifications"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
            disabled={isRequesting}
            className="w-full"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Inline banner variant for less intrusive prompts
export function NotificationPermissionBanner() {
  const { permission, isSupported, requestPermission } = useNotificationContext();
  const [isVisible, setIsVisible] = React.useState(false);
  const [isRequesting, setIsRequesting] = React.useState(false);

  React.useEffect(() => {
    if (!isSupported || permission !== "default") {
      setIsVisible(false);
      return;
    }

    if (wasPromptDismissedRecently()) {
      return;
    }

    // Show immediately for banner variant
    setIsVisible(true);
  }, [isSupported, permission]);

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    markPromptDismissed();
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Enable notifications to stay updated on mentions and messages.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleEnable}
          disabled={isRequesting}
        >
          {isRequesting ? "..." : "Enable"}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          disabled={isRequesting}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
