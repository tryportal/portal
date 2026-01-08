"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { getIconComponent } from "@/components/icon-picker";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ChatInterface } from "@/components/preview/chat-interface";
import { useUserDataCache } from "@/components/user-data-cache";
import type { Message, Attachment, Reaction, LinkEmbed } from "@/components/preview/message-list";
import type { PinnedMessage } from "@/components/preview/pinned-messages-dialog";
import type { MentionUser } from "@/components/preview/mention-autocomplete";
import type { Id } from "@/convex/_generated/dataModel";
import { usePageTitle } from "@/lib/use-page-title";
import { analytics } from "@/lib/analytics";

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string; category: string; channel: string }>;
}) {
  const router = useRouter();
  const { user } = useUser();
  const { cache: userDataCache, fetchUserData } = useUserDataCache();
  
  const [routeParams, setRouteParams] = React.useState<{
    slug: string;
    category: string;
    channel: string;
  } | null>(null);

  // Resolve params if it's a Promise (Next.js 15+)
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setRouteParams(resolved));
    } else {
      setRouteParams(params);
    }
  }, [params]);

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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

  // Get messages for the channel (paginated - loads 50 most recent)
  const messagesData = useQuery(
    api.messages.getMessages,
    channelId ? { channelId, limit: 50 } : "skip"
  );
  
  // Extract messages array from paginated response
  const rawMessages = messagesData?.messages;

  // Server-side search (only if search query is long enough and we have a channel)
  const serverSearchResults = useQuery(
    api.messages.searchMessages,
    channelId && debouncedSearchQuery.length > 2
      ? { channelId, query: debouncedSearchQuery, limit: 50 }
      : "skip"
  );

  // Client-side filtering and hybrid search logic
  const filteredMessages = React.useMemo(() => {
    if (!rawMessages) return [];
    
    // No search query - return all loaded messages
    if (!searchQuery.trim()) {
      return rawMessages;
    }

    const searchTerm = searchQuery.toLowerCase().trim();

    // First, filter loaded messages client-side
    const clientResults = rawMessages.filter((msg) =>
      msg.content.toLowerCase().includes(searchTerm)
    );

    // If we have client results OR search query is too short for server search, return client results
    if (clientResults.length > 0 || debouncedSearchQuery.length <= 2) {
      return clientResults;
    }

    // No client results and query is long enough - use server results
    if (serverSearchResults && serverSearchResults.length > 0) {
      // Deduplicate by message ID
      const messageMap = new Map<string, typeof serverSearchResults[number]>();
      serverSearchResults.forEach((msg) => {
        messageMap.set(msg._id, msg);
      });
      return Array.from(messageMap.values());
    }

    // No results at all
    return [];
  }, [rawMessages, debouncedSearchQuery, serverSearchResults]);

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
  const editMessage = useMutation(api.messages.editMessage);
  const setTyping = useMutation(api.messages.setTyping);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const togglePin = useMutation(api.messages.togglePin);
  const saveMessage = useMutation(api.messages.saveMessage);
  const unsaveMessage = useMutation(api.messages.unsaveMessage);
  const forwardMessage = useMutation(api.messages.forwardMessage);

  // Real-time subscription for typing users (replaces polling)
  const typingUsersQuery = useQuery(
    api.messages.getTypingUsersQuery,
    channelId ? { channelId } : "skip"
  );

  // Fetch user data for typing users
  React.useEffect(() => {
    if (typingUsersQuery?.typingUsers && typingUsersQuery.typingUsers.length > 0) {
      fetchUserData(typingUsersQuery.typingUsers);
    }
  }, [typingUsersQuery?.typingUsers, fetchUserData]);

  // Transform typing users with cached user data
  const typingUsers = React.useMemo(() => {
    if (!typingUsersQuery?.typingUsers) return [];
    return typingUsersQuery.typingUsers.map((userId) => {
      const cached = userDataCache[userId];
      return {
        userId,
        firstName: cached?.firstName ?? null,
        lastName: cached?.lastName ?? null,
        imageUrl: cached?.imageUrl ?? null,
      };
    });
  }, [typingUsersQuery?.typingUsers, userDataCache]);

  // Fetch user data for all unique user IDs in messages using global cache
  React.useEffect(() => {
    if (!filteredMessages || filteredMessages.length === 0) return;

    const uniqueUserIds = Array.from(new Set(filteredMessages.map(msg => msg.userId)));
    fetchUserData(uniqueUserIds);
  }, [filteredMessages, fetchUserData]);

  // Also fetch user data for pinned messages
  React.useEffect(() => {
    if (!pinnedMessagesRaw || pinnedMessagesRaw.length === 0) return;

    const uniqueUserIds = Array.from(new Set(pinnedMessagesRaw.map(msg => msg.userId)));
    fetchUserData(uniqueUserIds);
  }, [pinnedMessagesRaw, fetchUserData]);

  // Redirect if channel not found (after data is loaded)
  React.useEffect(() => {
    if (channelData === null && routeParams) {
      router.replace(`/w/${routeParams.slug}`);
    }
  }, [channelData, routeParams, router]);

  // Build a map of message IDs to their data for parent message lookups
  const messageMap = React.useMemo(() => {
    const map = new Map<string, { content: string; userId: string }>();
    (filteredMessages || []).forEach((msg) => {
      map.set(msg._id, { content: msg.content, userId: msg.userId });
    });
    return map;
  }, [filteredMessages]);

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

  // Set page title - must be called before any early returns to maintain hook order
  const channelName = channelData?.channel?.name;
  usePageTitle(channelName ? `${channelName} - Portal` : "Portal");

  // Track channel view with duplicate prevention
  const trackedChannelRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (channelId && channelName && trackedChannelRef.current !== channelId) {
      analytics.channelViewed({ channelId, name: channelName });
      trackedChannelRef.current = channelId;
    }
  }, [channelId, channelName]);

  // Optimized loading state - only wait for essential data (channel + messages)
  // User data and images load progressively
  if (!routeParams || channelData === undefined || messagesData === undefined) {
    return <LoadingSpinner fullScreen />;
  }

  // Redirecting state
  if (channelData === null) {
    return <LoadingSpinner fullScreen />;
  }

  const { channel, membership } = channelData;
  const Icon = channel.icon ? getIconComponent(channel.icon) : undefined;
  const isReadOnly = channel.permissions === "readOnly";
  const isAdmin = membership?.role === "admin";
  const canPost = !isReadOnly || isAdmin;
  const currentUserId = user?.id;

  // Transform raw messages to the format expected by ChatInterface
  const messages: Message[] = (filteredMessages || []).map((msg) => {
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
    const attachments: Attachment[] = msg.attachments?.map((att: any) => ({
      storageId: att.storageId,
      name: att.name,
      size: att.size,
      type: att.type,
    })) || [];

    // Transform reactions
    const reactions: Reaction[] | undefined = msg.reactions?.map((r: any) => ({
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
      createdAt: msg.createdAt, // Add raw timestamp for grouping
      user: {
        id: msg.userId,
        name,
        avatar: imageUrl || undefined,
        initials,
      },
      attachments: attachments.length > 0 ? attachments : undefined,
      linkEmbed: msg.linkEmbed,
      editedAt: msg.editedAt,
      parentMessageId: msg.parentMessageId,
      parentMessage,
      reactions: reactions && reactions.length > 0 ? reactions : undefined,
      pinned: msg.pinned,
      mentions: msg.mentions,
      forwardedFrom: msg.forwardedFrom ? {
        channelName: msg.forwardedFrom.channelName,
        userName: msg.forwardedFrom.userName,
      } : undefined,
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
    parentMessageId?: string,
    linkEmbed?: LinkEmbed
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
        linkEmbed,
        parentMessageId: parentMessageId as Id<"messages"> | undefined,
      });
      analytics.messageSent({
        channelId,
        hasAttachments: !!attachments?.length,
        isReply: !!parentMessageId,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage({ messageId: messageId as Id<"messages"> });
      analytics.messageDeleted();
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await editMessage({ 
        messageId: messageId as Id<"messages">, 
        content 
      });
      analytics.messageEdited();
    } catch (error) {
      console.error("Failed to edit message:", error);
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
      analytics.reactionAdded({ emoji });
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  const handlePin = async (messageId: string) => {
    try {
      await togglePin({ messageId: messageId as Id<"messages"> });
      analytics.messagePinned();
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const handleSave = async (messageId: string) => {
    try {
      await saveMessage({ messageId: messageId as Id<"messages"> });
      analytics.messageSaved();
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

  const handleForwardToChannel = async (messageId: string, targetChannelId: string) => {
    try {
      const result = await forwardMessage({ 
        messageId: messageId as Id<"messages">,
        targetChannelId: targetChannelId as Id<"channels">,
      });
      analytics.messageForwarded();
      
      if (result && routeParams) {
        toast.success(`Message forwarded to #${result.targetName}`);
        // Navigate to the target channel
        if (result.categoryName && result.organizationSlug) {
          router.push(`/w/${result.organizationSlug}/${encodeURIComponent(result.categoryName)}/${encodeURIComponent(result.targetName)}`);
        }
      }
    } catch (error) {
      console.error("Failed to forward message:", error);
      toast.error("Failed to forward message");
    }
  };

  const handleForwardToConversation = async (messageId: string, targetConversationId: string) => {
    try {
      const result = await forwardMessage({ 
        messageId: messageId as Id<"messages">,
        targetConversationId: targetConversationId as Id<"conversations">,
      });
      analytics.messageForwarded();
      
      if (result && routeParams) {
        toast.success(`Message forwarded to @${result.targetName}`);
        // Navigate to the target conversation
        if (result.targetType === "conversation" && result.conversationId) {
          router.push(`/w/${routeParams.slug}/messages/${result.conversationId}`);
        }
      }
    } catch (error) {
      console.error("Failed to forward message:", error);
      toast.error("Failed to forward message");
    }
  };

  const handleAvatarClick = (userId: string) => {
    // Navigate to user profile
    if (routeParams) {
      router.push(`/w/${routeParams.slug}/people/${userId}`);
    }
  };

  const handleNameClick = (userId: string) => {
    // Navigate to user profile (same as avatar click)
    if (routeParams) {
      router.push(`/w/${routeParams.slug}/people/${userId}`);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 bg-card overflow-hidden">
      <ChatInterface
        channelName={channel.name}
        channelDescription={channel.description}
        channelIcon={Icon}
        messages={messages}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={handleEditMessage}
        onReaction={handleReaction}
        onPin={handlePin}
        onSave={handleSave}
        onUnsave={handleUnsave}
        onForwardToChannel={handleForwardToChannel}
        onForwardToConversation={handleForwardToConversation}
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
        organizationId={organizationId}
        channelId={channelId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </div>
  );
}
