"use client";

import * as React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { getIconComponent } from "@/components/icon-picker";
import { ChatInterface } from "@/components/preview/chat-interface";
import type { Message, Attachment } from "@/components/preview/message-list";
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

  // Mutations
  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const setTyping = useMutation(api.messages.setTyping);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

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
    };
  });

  const handleSendMessage = async (
    content: string, 
    attachments?: Array<{
      storageId: string;
      name: string;
      size: number;
      type: string;
    }>
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

  return (
    <div className="flex flex-1 flex-col bg-white">
      <ChatInterface
        channelName={channel.name}
        channelIcon={Icon}
        messages={messages}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        currentUserId={currentUserId}
        disabled={!canPost}
        disabledReason={isReadOnly && !isAdmin ? "This channel is read-only" : undefined}
        onTyping={handleTyping}
        generateUploadUrl={handleGenerateUploadUrl}
        typingUsers={typingUsers}
      />
    </div>
  );
}
