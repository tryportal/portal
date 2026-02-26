"use client";

import { use } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { DmChat } from "@/components/dm-chat";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);

  return (
    <DmChat conversationId={conversationId as Id<"conversations">} />
  );
}
