"use client";

import { Tray } from "@phosphor-icons/react";

export default function InboxPage() {
  return (
    <div className="flex flex-1 items-center justify-center" style={{ minHeight: "calc(100vh - 57px)" }}>
      <div className="text-center">
        <Tray size={32} className="mx-auto text-muted-foreground" />
        <h1 className="mt-3 text-sm font-medium">Inbox</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Mentions and notifications will appear here.
        </p>
      </div>
    </div>
  );
}
