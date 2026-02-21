"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useMentionNotifications(
  organizationId: Id<"organizations"> | undefined
) {
  const currentUser = useQuery(api.users.currentUser);
  const unreadCount = useQuery(
    api.overview.getUnreadMentionCount,
    organizationId ? { organizationId } : "skip"
  );
  const recentMentions = useQuery(
    api.overview.getRecentMentions,
    organizationId ? { organizationId } : "skip"
  );

  const prevCountRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Wait until data is loaded
    if (unreadCount === undefined || recentMentions === undefined) return;
    if (!currentUser?.notificationsEnabled) return;

    // Skip the first render to avoid firing on page load
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevCountRef.current = unreadCount;
      return;
    }

    const prevCount = prevCountRef.current ?? 0;
    prevCountRef.current = unreadCount;

    // Only fire when count increases
    if (unreadCount <= prevCount) return;

    // Don't notify if tab is focused
    if (document.hasFocus()) return;

    // Check browser permission
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    // Get the most recent unread mention for the notification body
    const latest = recentMentions?.find((m) => !m.isRead);
    if (!latest) return;

    const senderName = [latest.sender?.firstName, latest.sender?.lastName]
      .filter(Boolean)
      .join(" ") || "Someone";

    const body = latest.channelName
      ? `${senderName} mentioned you in #${latest.channelName}`
      : `${senderName} mentioned you`;

    new Notification("Portal", {
      body,
      icon: "/portal-icon.svg",
      tag: `mention-${latest._id}`,
    });
  }, [unreadCount, recentMentions, currentUser?.notificationsEnabled]);
}
