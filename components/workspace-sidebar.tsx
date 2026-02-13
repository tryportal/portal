"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  House,
  Users,
  GearSix,
  Hash,
  CaretDown,
  CaretRight,
  Plus,
  FolderSimple,
  ChatCircle,
} from "@phosphor-icons/react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface WorkspaceSidebarProps {
  slug: string;
  organizationId: Id<"organizations">;
}

export function WorkspaceSidebar({
  slug,
  organizationId,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const base = `/w/${slug}`;

  const data = useQuery(api.channels.getChannelsAndCategories, {
    organizationId,
  });

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleCategory = (id: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const navItems = [
    { label: "Overview", icon: House, href: "" },
    { label: "People", icon: Users, href: "/people" },
    { label: "Options", icon: GearSix, href: "/options" },
  ];

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      {/* Navigation */}
      <nav className="flex flex-col gap-px p-2">
        {navItems.map(({ label, icon: Icon, href }) => {
          const fullHref = base + href;
          const isActive = href === ""
            ? pathname === base || pathname === base + "/"
            : pathname.startsWith(base + href);

          return (
            <Link
              key={href}
              href={fullHref}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 text-xs transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-muted hover:text-sidebar-foreground"
              }`}
            >
              <Icon size={16} weight={isActive ? "fill" : "regular"} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-1">
        <Separator />
      </div>

      {/* Channels & Categories */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Channels
          </span>
        </div>

        {data === undefined && (
          <div className="px-2.5 py-1.5">
            <span className="text-[11px] text-muted-foreground">Loading...</span>
          </div>
        )}

        {data?.map((category) => {
          const isCollapsed = collapsedCategories.has(category._id);

          return (
            <div key={category._id} className="mt-1">
              <button
                onClick={() => toggleCategory(category._id)}
                className="flex w-full items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-sidebar-foreground"
              >
                {isCollapsed ? (
                  <CaretRight size={12} weight="bold" />
                ) : (
                  <CaretDown size={12} weight="bold" />
                )}
                {category.name}
              </button>

              {!isCollapsed && (
                <div className="flex flex-col gap-px">
                  {category.channels.map((channel) => {
                    const channelHref = `${base}/channels/${channel.name}`;
                    const isChannelActive = pathname === channelHref;
                    const IconComponent =
                      channel.channelType === "forum" ? ChatCircle : Hash;

                    return (
                      <Link
                        key={channel._id}
                        href={channelHref}
                        className={`flex items-center gap-2 py-1 pl-6 pr-2.5 text-xs transition-colors ${
                          isChannelActive
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-sidebar-foreground/60 hover:bg-muted hover:text-sidebar-foreground"
                        }`}
                      >
                        <IconComponent size={14} />
                        <span className="truncate">{channel.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {data && data.length === 0 && (
          <div className="px-2.5 py-3 text-center">
            <p className="text-[11px] text-muted-foreground">
              No channels yet
            </p>
          </div>
        )}
      </div>

      {/* Create New Button */}
      <div className="border-t border-border p-2">
        <CreateNewMenu
          slug={slug}
          organizationId={organizationId}
          categories={data ?? []}
        />
      </div>
    </aside>
  );
}

function CreateNewMenu({
  slug,
  organizationId,
  categories,
}: {
  slug: string;
  organizationId: Id<"organizations">;
  categories: { _id: Id<"channelCategories">; name: string }[];
}) {
  const [mode, setMode] = useState<"idle" | "channel" | "category">("idle");
  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const createCategory = useMutation(api.channels.createCategory);
  const createChannel = useMutation(api.channels.createChannel);

  const reset = () => {
    setMode("idle");
    setName("");
    setSelectedCategory("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    if (mode === "category") {
      await createCategory({
        organizationId,
        name: name.trim(),
      });
    } else if (mode === "channel" && selectedCategory) {
      await createChannel({
        organizationId,
        categoryId: selectedCategory as Id<"channelCategories">,
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
      });
    }

    reset();
  };

  if (mode !== "idle") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            New {mode}
          </span>
          <button
            onClick={reset}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={mode === "category" ? "Category name" : "channel-name"}
          className="h-7 w-full border border-border bg-background px-2 text-xs outline-none placeholder:text-muted-foreground focus:border-ring"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") reset();
          }}
        />
        {mode === "channel" && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-7 w-full border border-border bg-background px-2 text-xs outline-none focus:border-ring"
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={
            !name.trim() || (mode === "channel" && !selectedCategory)
          }
          className="w-full"
        >
          Create {mode}
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center justify-center gap-2 border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted cursor-pointer outline-none"
      >
        <Plus size={14} />
        Create new
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" sideOffset={4} className="w-[calc(var(--anchor-width))]">
        <DropdownMenuItem onClick={() => setMode("channel")}>
          <Hash size={14} />
          Channel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setMode("category")}>
          <FolderSimple size={14} />
          Category
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
