"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { MagnifyingGlass } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DotLoader } from "@/components/ui/dot-loader";

interface NewDmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewDmDialog({ open, onOpenChange }: NewDmDialogProps) {
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { user } = useUser();

  const currentUserData = useQuery(api.users.currentUser);
  const organizationId = currentUserData?.primaryWorkspaceId;

  const members = useQuery(
    api.organizations.getWorkspaceMembers,
    organizationId ? { organizationId } : "skip"
  );

  const getOrCreateConversation = useMutation(
    api.conversations.getOrCreateConversation
  );

  // Filter out current user and match search
  const filtered = members?.filter((m) => {
    if (m.userId === user?.id) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.toLowerCase();
    return name.includes(s) || (m.email?.toLowerCase().includes(s) ?? false);
  });

  const handleSelectMember = async (memberId: string) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const conversationId = await getOrCreateConversation({
        otherUserId: memberId,
      });
      onOpenChange(false);
      setSearch("");
      router.push(`/chat/${conversationId}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) setSearch("");
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>
            Search for a workspace member to start a conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <div className="flex h-8 items-center border border-border bg-background text-xs">
            <span className="flex h-full items-center border-r border-border bg-muted px-2 text-muted-foreground">
              <MagnifyingGlass size={12} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="h-full flex-1 bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            {members === undefined && (
              <div className="flex justify-center py-6">
                <DotLoader />
              </div>
            )}

            {filtered?.map((member) => {
              const displayName =
                [member.firstName, member.lastName].filter(Boolean).join(" ") ||
                member.email ||
                "Unknown";
              const initials = (
                member.firstName?.[0] ??
                member.email?.[0] ??
                "?"
              ).toUpperCase();

              return (
                <button
                  key={member.userId}
                  onClick={() => handleSelectMember(member.userId)}
                  disabled={isCreating}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {member.imageUrl ? (
                    <img
                      src={member.imageUrl}
                      alt=""
                      className="size-6 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="flex size-6 shrink-0 items-center justify-center bg-muted text-[10px] font-medium">
                      {initials}
                    </div>
                  )}
                  <span className="min-w-0 flex-1 truncate">{displayName}</span>
                </button>
              );
            })}

            {filtered?.length === 0 && members !== undefined && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No members found
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
