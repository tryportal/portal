"use client";

import { ChatCircle } from "@phosphor-icons/react";

export default function ChatPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <ChatCircle size={32} className="mx-auto text-muted-foreground/40" />
        <h1 className="mt-3 text-sm font-medium">Messages</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Select a conversation or start a new one.
        </p>
      </div>
    </div>
  );
}
