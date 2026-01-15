import { track, type EventProperties } from "@databuddy/sdk";

const safeTrack = (name: string, props?: EventProperties) => {
  track(name, props);
};

// Type-safe event tracking
export const analytics = {
  // Workspace events
  workspaceCreated: (props: { workspaceId: string; name: string }) => {
    safeTrack("workspace_created", props);
  },
  workspaceJoined: (props: { slug: string }) => {
    safeTrack("workspace_joined", props);
  },
  workspaceViewed: (props: { workspaceId: string; slug: string }) => {
    safeTrack("workspace_viewed", props);
  },

  // Channel events
  channelCreated: (props: { channelId: string; name: string; workspaceId: string }) => {
    safeTrack("channel_created", props);
  },
  channelViewed: (props: { channelId: string; name: string }) => {
    safeTrack("channel_viewed", props);
  },

  // Message events
  messageSent: (props: { channelId?: string; conversationId?: string; hasAttachments: boolean; isReply: boolean }) => {
    safeTrack("message_sent", props);
  },
  messageEdited: () => {
    safeTrack("message_edited");
  },
  messageDeleted: () => {
    safeTrack("message_deleted");
  },
  reactionAdded: (props: { emoji: string }) => {
    safeTrack("reaction_added", props);
  },
  messagePinned: () => {
    safeTrack("message_pinned");
  },
  messageSaved: () => {
    safeTrack("message_saved");
  },
  messageForwarded: () => {
    safeTrack("message_forwarded");
  },

  // DM events
  conversationStarted: () => {
    safeTrack("conversation_started");
  },

  // Invitation events
  invitationSent: (props: { method: "email" | "link"; role: string }) => {
    safeTrack("invitation_sent", props);
  },
  inviteLinkCreated: () => {
    safeTrack("invite_link_created");
  },
  inviteLinkCopied: () => {
    safeTrack("invite_link_copied");
  },
  inviteAccepted: (props: { method: "email" | "link" }) => {
    safeTrack("invite_accepted", props);
  },

  // File events
  fileUploaded: (props: { type: string; size: number }) => {
    safeTrack("file_uploaded", props);
  },

  // Setup events
  setupStepCompleted: (props: { step: number; stepName: string }) => {
    safeTrack("setup_step_completed", props);
  },
  setupCompleted: () => {
    safeTrack("setup_completed");
  },

  // Navigation events
  tabChanged: (props: { tab: string }) => {
    safeTrack("tab_changed", props);
  },

  // Engagement events (non-invasive)
  searchUsed: (props: { context: "channel" | "dm" | "global"; hasResults: boolean }) => {
    safeTrack("search_used", props);
  },
  profileViewed: (props: { isOwnProfile: boolean }) => {
    safeTrack("profile_viewed", props);
  },
  settingsOpened: (props: { section?: string }) => {
    safeTrack("settings_opened", props);
  },
  themeChanged: (props: { theme: "light" | "dark" | "system" }) => {
    safeTrack("theme_changed", props);
  },
  notificationsEnabled: () => {
    safeTrack("notifications_enabled");
  },
  memberRemoved: () => {
    safeTrack("member_removed");
  },
  roleChanged: () => {
    safeTrack("role_changed");
  },
};
