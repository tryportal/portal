"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
} from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useOptionalWorkspace } from "@/components/workspace-context";
import Image from "next/image";
import { Users } from "@phosphor-icons/react";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";

interface MemberItem {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  imageUrl: string | null;
}

interface MentionListProps {
  items: MemberItem[];
  command: (item: { id: string; label: string }) => void;
}

interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Reset selection index when items change
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setSelectedIndex(0); }, [items]);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (!item) return;
        const name =
          [item.firstName, item.lastName].filter(Boolean).join(" ") ||
          item.email ||
          "Unknown";
        command({ id: item.userId, label: name });
      },
      [items, command]
    );

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="border border-border bg-popover p-2 shadow-md">
          <span className="text-xs text-muted-foreground">
            No members found
          </span>
        </div>
      );
    }

    return (
      <div className="border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
        {items.map((item, index) => {
          const name =
            [item.firstName, item.lastName].filter(Boolean).join(" ") ||
            item.email ||
            "Unknown";
          return (
            <button
              key={item.userId}
              // preventDefault on mousedown/touchstart prevents the editor
              // from losing focus, which would dismiss the suggestion on mobile
              // before the click/tap registers
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={() => selectItem(index)}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors md:px-2.5 md:py-1.5 ${
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {item.userId === "everyone" ? (
                <div className="flex size-5 shrink-0 items-center justify-center bg-muted text-muted-foreground">
                  <Users size={12} weight="bold" />
                </div>
              ) : item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={name}
                  width={20}
                  height={20}
                  className="size-5 shrink-0 object-cover"
                />
              ) : (
                <div className="flex size-5 shrink-0 items-center justify-center bg-muted text-[8px] font-medium text-muted-foreground">
                  {(
                    item.firstName?.[0] ||
                    item.email?.[0] ||
                    "?"
                  ).toUpperCase()}
                </div>
              )}
              <span className="truncate">{name}</span>
            </button>
          );
        })}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";

// Hook to provide filtered members for the suggestion
export function useMentionSuggestion(
  channelId?: Id<"channels">,
  organizationId?: Id<"organizations">
): Omit<SuggestionOptions, "editor"> {
  const workspace = useOptionalWorkspace();
  const resolvedOrgId = organizationId ?? workspace?._id;
  const members = useQuery(
    api.organizations.getWorkspaceMembers,
    resolvedOrgId ? { organizationId: resolvedOrgId } : "skip"
  );
  const sharedMembers = useQuery(
    api.sharedChannels.getSharedMembers,
    channelId ? { channelId } : "skip"
  );

  // Use a ref so the items callback always reads the latest members data,
  // even though TipTap captures the suggestion config once at editor creation.
  const membersRef = useRef(members);
  const sharedMembersRef = useRef(sharedMembers);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    sharedMembersRef.current = sharedMembers;
  }, [sharedMembers]);

  return {
    items: ({ query }: { query: string }) => {
      const currentMembers = membersRef.current;
      if (!currentMembers) return [];
      const q = query.toLowerCase();

      // Build @everyone entry when query matches
      const everyoneItem: MemberItem = {
        userId: "everyone",
        firstName: "everyone",
        lastName: null,
        email: null,
        imageUrl: null,
      };
      const showEveryone = "everyone".includes(q);

      // Workspace members filtered
      const filtered: MemberItem[] = currentMembers.filter((m) => {
        const name = [m.firstName, m.lastName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const email = (m.email ?? "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });

      // Merge shared channel members (deduplicate by userId)
      const seenIds = new Set(filtered.map((m) => m.userId));
      const currentShared = sharedMembersRef.current;
      if (currentShared) {
        for (const sm of currentShared) {
          if (seenIds.has(sm.userId)) continue;
          const name = (sm.userName ?? "").toLowerCase();
          if (!name.includes(q)) continue;
          seenIds.add(sm.userId);
          const nameParts = (sm.userName ?? "").split(" ");
          filtered.push({
            userId: sm.userId,
            firstName: nameParts[0] ?? null,
            lastName: nameParts.slice(1).join(" ") || null,
            email: null,
            imageUrl: sm.userImageUrl ?? null,
          });
        }
      }

      const results = filtered.slice(0, 8);
      return showEveryone ? [everyoneItem, ...results] : results;
    },
    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null;
      let popup: HTMLDivElement | null = null;

      return {
        onStart: (props: SuggestionProps) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          popup = document.createElement("div");
          popup.style.position = "fixed";
          popup.style.zIndex = "50";
          document.body.appendChild(popup);

          popup.appendChild(component.element);
          updatePosition(props, popup);
        },
        onUpdate: (props: SuggestionProps) => {
          component?.updateProps(props);
          if (popup) updatePosition(props, popup);
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === "Escape") {
            popup?.remove();
            component?.destroy();
            popup = null;
            component = null;
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          popup?.remove();
          component?.destroy();
          popup = null;
          component = null;
        },
      };
    },
  };
}

function updatePosition(props: SuggestionProps, popup: HTMLDivElement) {
  const { clientRect } = props;
  if (!clientRect?.()) return;
  const rect = clientRect()!;

  // Find the editor container to anchor positioning
  const editorEl = props.editor.view.dom.closest(
    ".border.bg-background"
  );
  const editorRect = editorEl?.getBoundingClientRect();

  // Use bottom anchoring so we don't need offsetHeight (which is 0 before layout)
  popup.style.top = "auto";

  if (editorRect) {
    popup.style.left = `${editorRect.left}px`;
    popup.style.width = `${Math.min(editorRect.width, 280)}px`;
    // Anchor to bottom: place popup above the editor
    popup.style.bottom = `${window.innerHeight - editorRect.top + 4}px`;
  } else {
    popup.style.left = `${rect.left}px`;
    popup.style.bottom = `${window.innerHeight - rect.top + 4}px`;
  }

  // After layout, check if popup goes above viewport — if so, flip below
  requestAnimationFrame(() => {
    const popupRect = popup.getBoundingClientRect();
    if (popupRect.top < 0) {
      popup.style.bottom = "auto";
      const bottom = editorRect ? editorRect.bottom : rect.bottom;
      popup.style.top = `${bottom + 4}px`;
    }
  });
}
