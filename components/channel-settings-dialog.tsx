"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ChannelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: Id<"channels">;
  channelName: string;
  channelDescription?: string;
}

export function ChannelSettingsDialog({
  open,
  onOpenChange,
  channelId,
  channelName,
  channelDescription,
}: ChannelSettingsDialogProps) {
  const [name, setName] = useState(channelName);
  const [description, setDescription] = useState(channelDescription ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateChannel = useMutation(api.channels.updateChannel);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      setName(channelName);
      setDescription(channelDescription ?? "");
    }
  }, [open, channelName, channelDescription]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const oldName = channelName;
      await updateChannel({
        channelId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onOpenChange(false);

      // Redirect if the channel name changed and we're viewing it
      const newName = name.trim().toLowerCase().replace(/\s+/g, "-");
      if (newName !== oldName && pathname.endsWith(`/${oldName}`)) {
        const pathPrefix = pathname.substring(0, pathname.lastIndexOf("/"));
        router.push(`${pathPrefix}/${newName}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Channel settings</DialogTitle>
          <DialogDescription>
            Update the name or description of #{channelName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium">Name</label>
            <div className="flex h-8 items-center border border-border bg-background text-xs">
              <span className="flex h-full items-center border-r border-border bg-muted px-2 text-muted-foreground">
                #
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. design, marketing"
                className="h-full flex-1 bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="h-8 w-full border border-border bg-background px-2 text-xs outline-none placeholder:text-muted-foreground focus:border-ring"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
