"use client";

import { useWorkspace } from "@/components/workspace-context";
import { ChatInterface } from "@/components/preview/chat-interface";
import { OverviewPage } from "@/components/preview/overview-page";
import {
  mockCategories,
  getMessagesForChannel,
  getChannelInfo,
  mockUsers,
} from "@/components/preview/mock-data";
import type { Message } from "@/components/preview/message-list";
import * as React from "react";

export default function WorkspacePage() {
  const { activeChannel, setActiveChannel } = useWorkspace();
  
  const [messages, setMessages] = React.useState<Record<string, Message[]>>(
    () => {
      // Initialize with mock messages
      const initial: Record<string, Message[]> = {};
      for (const category of mockCategories) {
        for (const channel of category.channels) {
          initial[channel.id] = getMessagesForChannel(channel.id);
        }
      }
      return initial;
    }
  );

  const channelInfo = activeChannel ? getChannelInfo(activeChannel) : null;
  const currentMessages = activeChannel ? messages[activeChannel] || [] : [];

  const handleSendMessage = (content: string) => {
    if (!activeChannel) return;
    
    const newMessage: Message = {
      id: `${Date.now()}`,
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      user: mockUsers.john, // Current user
    };

    setMessages((prev) => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMessage],
    }));
  };

  return (
    <main className="flex-1 overflow-hidden">
      {activeChannel && channelInfo ? (
        <ChatInterface
          channelName={channelInfo.name}
          channelIcon={channelInfo.icon}
          messages={currentMessages}
          onSendMessage={handleSendMessage}
        />
      ) : (
        <OverviewPage
          categories={mockCategories}
          onChannelSelect={setActiveChannel}
        />
      )}
    </main>
  );
}
