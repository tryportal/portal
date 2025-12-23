"use client";

import * as React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { getIconComponent } from "@/components/icon-picker";
import { ChatInterface } from "@/components/preview/chat-interface";
import type { Message, Attachment, Reaction } from "@/components/preview/message-list";
import type { PinnedMessage } from "@/components/preview/pinned-messages-dialog";
import type { MentionUser } from "@/components/preview/mention-autocomplete";
import type { Id } from "@/convex/_generated/dataModel";

// Polling interval for typing users (in ms)
const TYPING_POLL_INTERVAL = 2000;

export default function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string; category: string; channel: string }>;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [routeParams, setRouteParams] = React.useState<{
    slug: string;
    category: string;
    channel: string;
  } | null>(null);

  // Typing users state (from action)
  const [typingUsers, setTypingUsers] = React.useState<Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  }>>([]);

  // Resolve params if it's a Promise (Next.js 15+)
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setRouteParams(resolved));
    } else {
      setRouteParams(params);
    }
  }, [params]);

  // Get channel data by route
  const channelData = useQuery(
    api.channels.getChannelByRoute,
    routeParams
      ? {
          orgSlug: routeParams.slug,
          categoryName: decodeURIComponent(routeParams.category),
          channelName: decodeURIComponent(routeParams.channel),
        }
      : "skip"
  );

  // Get channel ID for queries
  const channelId = channelData?.channel?._id;

  // Get messages for the channel
  const rawMessages = useQuery(
    api.messages.getMessages,
    channelId ? { channelId } : "skip"
  );

  // Get organization ID for additional queries
  const organizationId = channelData?.channel?.organizationId;

  // Get pinned messages for the channel
  const pinnedMessagesRaw = useQuery(
    api.messages.getPinnedMessages,
    channelId ? { channelId } : "skip"
  );

  // Get saved messages for the user
  const savedMessagesRaw = useQuery(
    api.messages.getSavedMessages,
    organizationId ? { organizationId, limit: 100 } : "skip"
  );

  // Get organization members for mention autocomplete
  const orgMembersRaw = useQuery(
    api.messages.getOrganizationMembers,
    organizationId ? { organizationId } : "skip"
  );

  // Mutations
  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const setTyping = useMutation(api.messages.setTyping);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const togglePin = useMutation(api.messages.togglePin);
  const saveMessage = useMutation(api.messages.saveMessage);
  const unsaveMessage = useMutation(api.messages.unsaveMessage);
  const forwardMessage = useMutation(api.messages.forwardMessage);

  // Actions
  const getTypingUsersAction = useAction(api.messages.getTypingUsers);
  const getUserDataAction = useAction(api.messages.getUserData);

  // State for user data cache
  const [userDataCache, setUserDataCache] = React.useState<Record<string, {
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  }>>({});

  // Poll for typing users
  React.useEffect(() => {
    if (!channelId) return;

    const fetchTypingUsers = async () => {
      try {
        const users = await getTypingUsersAction({ channelId });
        setTypingUsers(users);
      } catch {
        // Ignore errors
      }
    };

    // Fetch immediately
    fetchTypingUsers();

    // Set up polling
    const interval = setInterval(fetchTypingUsers, TYPING_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [channelId, getTypingUsersAction]);

  // Fetch user data for all unique user IDs in messages
  React.useEffect(() => {
    if (!rawMessages || rawMessages.length === 0) return;

    const uniqueUserIds = Array.from(new Set(rawMessages.map(msg => msg.userId)));
    const missingUserIds = uniqueUserIds.filter(userId => !userDataCache[userId]);

    if (missingUserIds.length === 0) return;

    const fetchUserData = async () => {
      try {
        const usersData = await getUserDataAction({ userIds: missingUserIds });
        const newCache: typeof userDataCache = {};
        usersData.forEach(user => {
          newCache[user.userId] = {
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
          };
        });
        setUserDataCache(prev => ({ ...prev, ...newCache }));
      } catch {
        // Ignore errors
      }
    };

    fetchUserData();
  }, [rawMessages, getUserDataAction, userDataCache]);

  // Redirect if channel not found (after data is loaded)
  React.useEffect(() => {
    if (channelData === null && routeParams) {
      router.replace(`/${routeParams.slug}`);
    }
  }, [channelData, routeParams, router]);

  // Build a map of message IDs to their data for parent message lookups
  const messageMap = React.useMemo(() => {
    const map = new Map<string, { content: string; userId: string }>();
    (rawMessages || []).forEach((msg) => {
      map.set(msg._id, { content: msg.content, userId: msg.userId });
    });
    return map;
  }, [rawMessages]);

  // Build user names map for mentions and reactions
  const userNames: Record<string, string> = React.useMemo(() => {
    const names: Record<string, string> = {};
    Object.entries(userDataCache).forEach(([userId, data]) => {
      const firstName = data.firstName;
      const lastName = data.lastName;
      names[userId] = firstName && lastName 
        ? `${firstName} ${lastName}` 
        : firstName || userId;
    });
    // Add current user
    if (user?.id) {
      names[user.id] = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.firstName || user.id;
    }
    return names;
  }, [userDataCache, user]);

  // Build saved message IDs set
  const savedMessageIds: Set<string> = React.useMemo(() => {
    const ids = new Set<string>();
    (savedMessagesRaw || []).forEach((msg) => {
      ids.add(msg._id);
    });
    return ids;
  }, [savedMessagesRaw]);

  // Build mention users list for autocomplete
  const mentionUsers: MentionUser[] = React.useMemo(() => {
    if (!orgMembersRaw) return [];
    return orgMembersRaw.map((member) => {
      const cached = userDataCache[member.userId];
      const firstName = cached?.firstName ?? (user?.id === member.userId ? user?.firstName : null) ?? null;
      const lastName = cached?.lastName ?? (user?.id === member.userId ? user?.lastName : null) ?? null;
      const imageUrl = cached?.imageUrl ?? (user?.id === member.userId ? user?.imageUrl : null) ?? null;
      
      return {
        userId: member.userId,
        firstName,
        lastName,
        imageUrl,
      };
    });
  }, [orgMembersRaw, userDataCache, user]);

  // Build pinned messages list for dialog
  const pinnedMessages: PinnedMessage[] = React.useMemo(() => {
    if (!pinnedMessagesRaw) return [];
    return pinnedMessagesRaw.map((msg) => {
      const cached = userDataCache[msg.userId];
      const firstName = cached?.firstName ?? (user?.id === msg.userId ? user?.firstName : null);
      const lastName = cached?.lastName ?? (user?.id === msg.userId ? user?.lastName : null);
      const imageUrl = cached?.imageUrl ?? (user?.id === msg.userId ? user?.imageUrl : null);
      
      const userName = firstName && lastName 
        ? `${firstName} ${lastName}` 
        : firstName || "Unknown User";
      
      const initials = firstName && lastName
        ? `${firstName[0]}${lastName[0]}`
        : firstName?.[0] || "?";
      
      return {
        id: msg._id,
        content: msg.content,
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], { 
          hour: "numeric", 
          minute: "2-digit" 
        }),
        user: {
          id: msg.userId,
          name: userName,
          avatar: imageUrl || undefined,
          initials,
        },
      };
    });
  }, [pinnedMessagesRaw, userDataCache, user]);

  // Loading state
  if (!routeParams || channelData === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <CircleNotchIcon className="size-6 animate-spin text-[#26251E]/20" />
      </div>
    );
  }

  // Redirecting state
  if (channelData === null) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <CircleNotchIcon className="size-6 animate-spin text-[#26251E]/20" />
      </div>
    );
  }

  const { channel, membership } = channelData;
  const Icon = channel.icon ? getIconComponent(channel.icon) : undefined;
  const isReadOnly = channel.permissions === "readOnly";
  const isAdmin = membership?.role === "admin";
  const canPost = !isReadOnly || isAdmin;
  const currentUserId = user?.id;

  // Transform raw messages to the format expected by ChatInterface
  const messages: Message[] = (rawMessages || []).map((msg) => {
    // Get user info from cache, fallback to current user's data if it's their message
    const cachedUserData = userDataCache[msg.userId];
    const firstName = cachedUserData?.firstName ?? (user?.id === msg.userId ? user?.firstName : null);
    const lastName = cachedUserData?.lastName ?? (user?.id === msg.userId ? user?.lastName : null);
    const imageUrl = cachedUserData?.imageUrl ?? (user?.id === msg.userId ? user?.imageUrl : null);
    
    const name = firstName && lastName 
      ? `${firstName} ${lastName}`
      : firstName || "Unknown User";
    
    const initials = firstName && lastName
      ? `${firstName[0]}${lastName[0]}`
      : firstName?.[0] || "?";

    // Transform attachments
    const attachments: Attachment[] = msg.attachments?.map(att => ({
      storageId: att.storageId,
      name: att.name,
      size: att.size,
      type: att.type,
    })) || [];

    // Transform reactions
    const reactions: Reaction[] | undefined = msg.reactions?.map(r => ({
      userId: r.userId,
      emoji: r.emoji,
    }));

    // Get parent message info for replies
    let parentMessage: { content: string; userName: string } | undefined;
    if (msg.parentMessageId) {
      const parent = messageMap.get(msg.parentMessageId);
      if (parent) {
        parentMessage = {
          content: parent.content,
          userName: userNames[parent.userId] || "Unknown User",
        };
      }
    }

    return {
      id: msg._id,
      content: msg.content,
      timestamp: new Date(msg.createdAt).toLocaleTimeString([], { 
        hour: "numeric", 
        minute: "2-digit" 
      }),
      user: {
        id: msg.userId,
        name,
        avatar: imageUrl || undefined,
        initials,
      },
      attachments: attachments.length > 0 ? attachments : undefined,
      editedAt: msg.editedAt,
      parentMessageId: msg.parentMessageId,
      parentMessage,
      reactions: reactions && reactions.length > 0 ? reactions : undefined,
      pinned: msg.pinned,
      mentions: msg.mentions,
    };
  });

  const handleSendMessage = async (
    content: string, 
    attachments?: Array<{
      storageId: string;
      name: string;
      size: number;
      type: string;
    }>,
    parentMessageId?: string
  ) => {
    if (!channelId) return;

    try {
      await sendMessage({
        channelId,
        content,
        attachments: attachments?.map(a => ({
          ...a,
          storageId: a.storageId as Id<"_storage">,
        })),
        parentMessageId: parentMessageId as Id<"messages"> | undefined,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage({ messageId: messageId as Id<"messages"> });
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleTyping = async () => {
    if (!channelId || !canPost) return;

    try {
      await setTyping({ channelId });
    } catch {
      // Ignore typing errors
    }
  };

  const handleGenerateUploadUrl = async () => {
    return await generateUploadUrl();
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleReaction({ 
        messageId: messageId as Id<"messages">, 
        emoji 
      });
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  const handlePin = async (messageId: string) => {
    try {
      await togglePin({ messageId: messageId as Id<"messages"> });
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const handleSave = async (messageId: string) => {
    try {
      await saveMessage({ messageId: messageId as Id<"messages"> });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  const handleUnsave = async (messageId: string) => {
    try {
      await unsaveMessage({ messageId: messageId as Id<"messages"> });
    } catch (error) {
      console.error("Failed to unsave message:", error);
    }
  };

  const handleForward = async (messageId: string, targetChannelId: string) => {
    try {
      await forwardMessage({ 
        messageId: messageId as Id<"messages">,
        targetChannelId: targetChannelId as Id<"channels">,
      });
    } catch (error) {
      console.error("Failed to forward message:", error);
    }
  };

  const handleAvatarClick = (userId: string) => {
    // Navigate to user profile
    if (routeParams) {
      router.push(`/${routeParams.slug}/people/${userId}`);
    }
  };

  const handleNameClick = (userId: string) => {
    // Navigate to user profile (same as avatar click)
    if (routeParams) {
      router.push(`/${routeParams.slug}/people/${userId}`);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-white">
      <ChatInterface
        channelName={channel.name}
        channelDescription={channel.description}
        channelIcon={Icon}
        messages={messages}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        onReaction={handleReaction}
        onPin={handlePin}
        onSave={handleSave}
        onUnsave={handleUnsave}
        onForward={handleForward}
        onAvatarClick={handleAvatarClick}
        onNameClick={handleNameClick}
        currentUserId={currentUserId}
        disabled={!canPost}
        disabledReason={isReadOnly && !isAdmin ? "This channel is read-only" : undefined}
        onTyping={handleTyping}
        generateUploadUrl={handleGenerateUploadUrl}
        typingUsers={typingUsers}
        pinnedMessages={pinnedMessages}
        savedMessageIds={savedMessageIds}
        userNames={userNames}
        mentionUsers={mentionUsers}
        isAdmin={isAdmin}
      />
    </div>
  );
}
