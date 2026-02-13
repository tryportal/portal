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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Width aligns with 4 navbar cells (logo + 3 nav icons) = 4 × 56px
const SIDEBAR_WIDTH = 224;

interface WorkspaceSidebarProps {
  slug: string;
  organizationId: Id<"organizations">;
  role?: string;
}

export function WorkspaceSidebar({
  slug,
  organizationId,
  role,
}: WorkspaceSidebarProps) {
  const isAdmin = role === "admin";
  const pathname = usePathname();
  const base = `/w/${slug}`;

  const data = useQuery(api.channels.getChannelsAndCategories, {
    organizationId,
  });

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  // Dialog state
  const [dialogMode, setDialogMode] = useState<"channel" | "category" | null>(
    null
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
    ...(isAdmin
      ? [{ label: "Options", icon: GearSix, href: "/options" }]
      : []),
  ];

  return (
    <>
      <aside
        className="flex h-full flex-col border-r border-border bg-sidebar text-sidebar-foreground"
        style={{ width: SIDEBAR_WIDTH }}
      >
        {/* Navigation */}
        <nav className="flex flex-col gap-px pl-2 pt-2 pb-2">
          {navItems.map(({ label, icon: Icon, href }) => {
            const fullHref = base + href;
            const isActive =
              href === ""
                ? pathname === base || pathname === base + "/"
                : pathname.startsWith(base + href);

            return (
              <Link
                key={href}
                href={fullHref}
                className={`flex items-center gap-2.5 rounded-l-[6px] border-r-2 px-2.5 py-1.5 text-xs ${
                  isActive
                    ? "border-sidebar-foreground/30 bg-primary text-primary-foreground font-medium"
                    : "border-transparent text-sidebar-foreground/70 hover:bg-muted hover:text-sidebar-foreground"
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
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground hover:text-sidebar-foreground cursor-pointer outline-none">
                  <Plus size={14} />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" sideOffset={4} align="end">
                  <DropdownMenuItem onClick={() => setDialogMode("channel")}>
                    <Hash size={14} />
                    Channel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDialogMode("category")}>
                    <FolderSimple size={14} />
                    Category
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {data === undefined && (
            <div className="px-2.5 py-1.5">
              <span className="text-[11px] text-muted-foreground">
                Loading...
              </span>
            </div>
          )}

          {data?.map((category) => {
            const isCollapsed = collapsedCategories.has(category._id);

            return (
              <div key={category._id} className="mt-1">
                <button
                  onClick={() => toggleCategory(category._id)}
                  className="flex w-full items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground"
                >
                  {isCollapsed ? (
                    <CaretRight size={12} weight="bold" />
                  ) : (
                    <CaretDown size={12} weight="bold" />
                  )}
                  <span className="truncate">{category.name}</span>
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
                          className={`flex items-center gap-2 py-1 pl-6 pr-2.5 text-xs ${
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


      </aside>

      {/* Create Channel Dialog */}
      <CreateChannelDialog
        open={dialogMode === "channel"}
        onOpenChange={(open) => !open && setDialogMode(null)}
        organizationId={organizationId}
        categories={data ?? []}
      />

      {/* Create Category Dialog */}
      <CreateCategoryDialog
        open={dialogMode === "category"}
        onOpenChange={(open) => !open && setDialogMode(null)}
        organizationId={organizationId}
      />
    </>
  );
}

function CreateChannelDialog({
  open,
  onOpenChange,
  organizationId,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organizations">;
  categories: { _id: Id<"channelCategories">; name: string }[];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createChannel = useMutation(api.channels.createChannel);

  const reset = () => {
    setName("");
    setDescription("");
    setSelectedCategory("");
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !selectedCategory) return;
    setIsSubmitting(true);

    try {
      await createChannel({
        organizationId,
        categoryId: selectedCategory as Id<"channelCategories">,
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
        description: description.trim() || undefined,
      });
      reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) reset();
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create channel</DialogTitle>
          <DialogDescription>
            Channels are where conversations happen. Create one for a topic or
            project.
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
            <label className="text-xs font-medium">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 w-full border border-border bg-background px-2 text-xs outline-none focus:border-ring"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
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
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!name.trim() || !selectedCategory || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateCategoryDialog({
  open,
  onOpenChange,
  organizationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organizations">;
}) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCategory = useMutation(api.channels.createCategory);

  const reset = () => {
    setName("");
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);

    try {
      await createCategory({
        organizationId,
        name: name.trim(),
      });
      reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) reset();
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create category</DialogTitle>
          <DialogDescription>
            Categories help organize your channels into groups.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering, General"
              className="h-8 w-full border border-border bg-background px-2 text-xs outline-none placeholder:text-muted-foreground focus:border-ring"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
