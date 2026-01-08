import posthog from "posthog-js";

// Type-safe event tracking
export const analytics = {
  // Workspace events
  workspaceCreated: (props: { workspaceId: string; name: string }) => {
    posthog.capture("workspace_created", props);
  },
  workspaceJoined: (props: { slug: string }) => {
    posthog.capture("workspace_joined", props);
  },
  workspaceViewed: (props: { workspaceId: string; slug: string }) => {
    posthog.capture("workspace_viewed", props);
  },

  // Channel events
  channelCreated: (props: { channelId: string; name: string; workspaceId: string }) => {
    posthog.capture("channel_created", props);
  },
  channelViewed: (props: { channelId: string; name: string }) => {
    posthog.capture("channel_viewed", props);
  },

  // Message events
  messageSent: (props: { channelId?: string; conversationId?: string; hasAttachments: boolean; isReply: boolean }) => {
    posthog.capture("message_sent", props);
  },
  messageEdited: () => {
    posthog.capture("message_edited");
  },
  messageDeleted: () => {
    posthog.capture("message_deleted");
  },
  reactionAdded: (props: { emoji: string }) => {
    posthog.capture("reaction_added", props);
  },
  messagePinned: () => {
    posthog.capture("message_pinned");
  },
  messageSaved: () => {
    posthog.capture("message_saved");
  },
  messageForwarded: () => {
    posthog.capture("message_forwarded");
  },

  // DM events
  conversationStarted: () => {
    posthog.capture("conversation_started");
  },

  // Invitation events
  invitationSent: (props: { method: "email" | "link"; role: string }) => {
    posthog.capture("invitation_sent", props);
  },
  inviteLinkCreated: () => {
    posthog.capture("invite_link_created");
  },
  inviteLinkCopied: () => {
    posthog.capture("invite_link_copied");
  },
  inviteAccepted: (props: { method: "email" | "link" }) => {
    posthog.capture("invite_accepted", props);
  },

  // File events
  fileUploaded: (props: { type: string; size: number }) => {
    posthog.capture("file_uploaded", props);
  },

  // Setup events
  setupStepCompleted: (props: { step: number; stepName: string }) => {
    posthog.capture("setup_step_completed", props);
  },
  setupCompleted: () => {
    posthog.capture("setup_completed");
  },

  // Navigation events
  tabChanged: (props: { tab: string }) => {
    posthog.capture("tab_changed", props);
  },

  // Engagement events (non-invasive)
  searchUsed: (props: { context: "channel" | "dm" | "global"; hasResults: boolean }) => {
    posthog.capture("search_used", props);
  },
  profileViewed: (props: { isOwnProfile: boolean }) => {
    posthog.capture("profile_viewed", props);
  },
  settingsOpened: (props: { section?: string }) => {
    posthog.capture("settings_opened", props);
  },
  themeChanged: (props: { theme: "light" | "dark" | "system" }) => {
    posthog.capture("theme_changed", props);
  },
  notificationsEnabled: () => {
    posthog.capture("notifications_enabled");
  },
  memberRemoved: () => {
    posthog.capture("member_removed");
  },
  roleChanged: () => {
    posthog.capture("role_changed");
  },
};
