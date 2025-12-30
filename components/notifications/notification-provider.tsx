"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  useNotifications,
  type NotificationPermissionState,
} from "@/lib/use-notifications";
import { useWorkspaceData } from "@/components/workspace-context";
import { useUserDataCache } from "@/components/user-data-cache";

interface NotificationContextValue {
  permission: NotificationPermissionState;
  isSupported: boolean;
  requestPermission: () => Promise<NotificationPermissionState>;
  isEnabled: boolean;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

export function useNotificationContext(): NotificationContextValue {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext must be used within a NotificationProvider");
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { permission, isSupported, requestPermission, showNotification, isTabVisible } =
    useNotifications();

  const isEnabled = permission === "granted" && isSupported;

  const value = React.useMemo(
    () => ({
      permission,
      isSupported,
      requestPermission,
      isEnabled,
    }),
    [permission, isSupported, requestPermission, isEnabled]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {isEnabled && <NotificationListener showNotification={showNotification} isTabVisible={isTabVisible} />}
    </NotificationContext.Provider>
  );
}

// Separate component that only mounts when notifications are enabled
// This handles subscribing to Convex queries and showing notifications
interface NotificationListenerProps {
  showNotification: (options: {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    url?: string;
  }) => void;
  isTabVisible: boolean;
}

function NotificationListener({ showNotification, isTabVisible }: NotificationListenerProps) {
  const { organization } = useWorkspaceData();
  const { getUserData, fetchUserData } = useUserDataCache();

  // Track seen message IDs to avoid duplicate notifications
  const seenMentionIds = React.useRef<Set<string>>(new Set());
  const seenDMIds = React.useRef<Set<string>>(new Set());
  const initialLoadRef = React.useRef(true);

  // Subscribe to mentions for this organization
  const mentions = useQuery(
    api.messages.getMentions,
    organization?._id ? { organizationId: organization._id, limit: 5 } : "skip"
  );

  // Subscribe to user conversations to get details about new DMs
  const conversations = useQuery(
    api.conversations.getUserConversations,
    organization?._id ? {} : "skip"
  );

  // Get the current URL slug from workspace
  const slug = organization?.slug;

  // Prefetch user data for mentions and DMs
  React.useEffect(() => {
    const userIds: string[] = [];
    
    if (mentions) {
      mentions.forEach((mention) => {
        if (mention.userId) userIds.push(mention.userId);
      });
    }
    
    if (conversations) {
      conversations.forEach((conv) => {
        if (conv.otherParticipantId) userIds.push(conv.otherParticipantId);
      });
    }
    
    if (userIds.length > 0) {
      fetchUserData(userIds);
    }
  }, [mentions, conversations, fetchUserData]);

  // Handle new mentions
  React.useEffect(() => {
    if (!mentions || mentions.length === 0 || !slug) return;

    // Skip initial load - we don't want to show notifications for existing mentions
    if (initialLoadRef.current) {
      // Mark all current mentions as seen
      mentions.forEach((mention) => {
        seenMentionIds.current.add(mention._id);
      });
      return;
    }

    // Find new mentions
    const newMentions = mentions.filter((mention) => !seenMentionIds.current.has(mention._id));

    for (const mention of newMentions) {
      seenMentionIds.current.add(mention._id);

      // Get user data for the sender
      const senderData = getUserData(mention.userId);
      const senderName = senderData
        ? `${senderData.firstName || ""} ${senderData.lastName || ""}`.trim() || "Someone"
        : "Someone";

      // Truncate message content for notification body
      const body = mention.content.length > 100
        ? mention.content.substring(0, 97) + "..."
        : mention.content;

      // Build URL to the channel where the mention occurred
      const url = mention.channelId
        ? `/w/${slug}/general/${mention.channelId}`
        : `/w/${slug}`;

      showNotification({
        title: `${senderName} mentioned you`,
        body,
        tag: `mention-${mention._id}`,
        url,
      });
    }
  }, [mentions, slug, getUserData, showNotification]);

  // Handle new DMs
  React.useEffect(() => {
    if (!conversations || conversations.length === 0 || !slug) return;

    // Skip initial load
    if (initialLoadRef.current) {
      // Mark all current conversations' last messages as seen
      conversations.forEach((conv) => {
        if (conv.lastMessage) {
          seenDMIds.current.add(`${conv._id}-${conv.lastMessage.createdAt}`);
        }
      });
      return;
    }

    // Find conversations with new messages
    for (const conv of conversations) {
      if (!conv.lastMessage) continue;

      const messageKey = `${conv._id}-${conv.lastMessage.createdAt}`;
      
      // Skip if we've already seen this message or if it's from the current user
      if (seenDMIds.current.has(messageKey)) continue;
      
      seenDMIds.current.add(messageKey);

      // Only notify if the message is from the other participant
      if (conv.lastMessage.userId === conv.otherParticipantId) {
        // Get user data for the sender
        const senderData = getUserData(conv.otherParticipantId);
        const senderName = senderData
          ? `${senderData.firstName || ""} ${senderData.lastName || ""}`.trim() || "Someone"
          : "Someone";

        // Truncate message content
        const body = conv.lastMessage.content.length > 100
          ? conv.lastMessage.content.substring(0, 97) + "..."
          : conv.lastMessage.content;

        showNotification({
          title: `New message from ${senderName}`,
          body,
          tag: `dm-${conv._id}-${conv.lastMessage.createdAt}`,
          url: `/w/${slug}/messages/${conv._id}`,
        });
      }
    }
  }, [conversations, slug, getUserData, showNotification]);

  // Mark initial load as complete after first render with data
  React.useEffect(() => {
    if (mentions !== undefined && conversations !== undefined) {
      // Wait a tick to ensure we've processed initial data
      const timer = setTimeout(() => {
        initialLoadRef.current = false;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mentions, conversations]);

  return null;
}

// Export a wrapped version that doesn't require WorkspaceProvider
// This is for use in the root layout before WorkspaceProvider is available
export function RootNotificationProvider({ children }: { children: React.ReactNode }) {
  const { permission, isSupported, requestPermission } = useNotifications();

  const isEnabled = permission === "granted" && isSupported;

  const value = React.useMemo(
    () => ({
      permission,
      isSupported,
      requestPermission,
      isEnabled,
    }),
    [permission, isSupported, requestPermission, isEnabled]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
