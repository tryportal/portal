"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  DotsThree,
  PencilSimple,
  Trash,
  Bell,
  BellSlash,
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
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { DotLoader } from "@/components/ui/dot-loader";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Width aligns with 4 navbar cells (logo + 3 nav icons) = 4 × 56px
const SIDEBAR_WIDTH = 224;

interface WorkspaceSidebarProps {
  slug: string;
  organizationId: Id<"organizations">;
  role?: string;
  isMobileDrawer?: boolean;
}

export function WorkspaceSidebar({
  slug,
  organizationId,
  role,
  isMobileDrawer,
}: WorkspaceSidebarProps) {
  const isAdmin = role === "admin";
  const pathname = usePathname();
  const router = useRouter();
  const base = `/w/${slug}`;

  const serverData = useQuery(api.channels.getChannelsAndCategories, {
    organizationId,
  });
  const mutedChannelIds = useQuery(api.overview.getMutedChannelIds) ?? [];
  const mutedSet = useMemo(() => new Set(mutedChannelIds), [mutedChannelIds]);
  const muteChannel = useMutation(api.messages.muteChannel);
  const unmuteChannel = useMutation(api.messages.unmuteChannel);

  // Optimistic local copy — updated instantly on drag, synced from server
  const [localData, setLocalData] = useState(serverData);
  useEffect(() => {
    if (serverData) setLocalData(serverData);
  }, [serverData]);

  // Expose as `data` so the rest of the component works unchanged
  const data = localData;

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  // Dialog state
  const [dialogMode, setDialogMode] = useState<"channel" | "category" | null>(
    null
  );

  // Channel edit/delete state
  const [editingChannel, setEditingChannel] = useState<{
    id: Id<"channels">;
    name: string;
    description?: string;
  } | null>(null);
  const [deletingChannel, setDeletingChannel] = useState<{
    id: Id<"channels">;
    name: string;
  } | null>(null);

  // Category edit/delete state
  const [editingCategory, setEditingCategory] = useState<{
    id: Id<"channelCategories">;
    name: string;
  } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<{
    id: Id<"channelCategories">;
    name: string;
  } | null>(null);

  const updateChannel = useMutation(api.channels.updateChannel);
  const deleteChannel = useMutation(api.channels.deleteChannel);
  const updateCategoryMutation = useMutation(api.channels.updateCategory);
  const deleteCategoryMutation = useMutation(api.channels.deleteCategory);
  const reorderCategories = useMutation(api.channels.reorderCategories);
  const reorderChannels = useMutation(api.channels.reorderChannels);

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"category" | "channel" | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const categoryIds = useMemo(
    () => data?.map((c) => c._id) ?? [],
    [data]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;
    if (data?.some((c) => c._id === id)) {
      setActiveType("category");
    } else {
      setActiveType("channel");
    }
    setActiveId(id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (activeType !== "channel") return;
    const { active, over } = event;
    if (!over || !data) return;

    const activeChannelId = active.id as string;
    const overId = over.id as string;

    // Find which category the active channel is in
    let activeCategoryIdx = -1;
    let activeChannelIdx = -1;
    for (let ci = 0; ci < data.length; ci++) {
      const chIdx = data[ci].channels.findIndex((ch) => ch._id === activeChannelId);
      if (chIdx !== -1) {
        activeCategoryIdx = ci;
        activeChannelIdx = chIdx;
        break;
      }
    }
    if (activeCategoryIdx === -1) return;

    // Find where we're hovering over
    let overCategoryIdx = -1;
    let overChannelIdx = -1;
    // Check if over a category (for dropping into empty category)
    overCategoryIdx = data.findIndex((c) => c._id === overId);
    if (overCategoryIdx === -1) {
      // Over a channel
      for (let ci = 0; ci < data.length; ci++) {
        const chIdx = data[ci].channels.findIndex((ch) => ch._id === overId);
        if (chIdx !== -1) {
          overCategoryIdx = ci;
          overChannelIdx = chIdx;
          break;
        }
      }
    }

    // No need to do anything during dragOver - we handle everything in dragEnd
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over || !data) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    if (activeType === "category") {
      // Reorder categories
      const oldIndex = data.findIndex((c) => c._id === activeId);
      const newIndex = data.findIndex((c) => c._id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(data, oldIndex, newIndex);
      setLocalData(newOrder);
      reorderCategories({
        organizationId,
        categoryIds: newOrder.map((c) => c._id) as Id<"channelCategories">[],
      });
    } else if (activeType === "channel") {
      // Find source category and channel index
      let sourceCatIdx = -1;
      let sourceChIdx = -1;
      for (let ci = 0; ci < data.length; ci++) {
        const chIdx = data[ci].channels.findIndex((ch) => ch._id === activeId);
        if (chIdx !== -1) {
          sourceCatIdx = ci;
          sourceChIdx = chIdx;
          break;
        }
      }
      if (sourceCatIdx === -1) return;

      // Find target - could be a channel or a category (droppable zone)
      let targetCatIdx = -1;
      let targetChIdx = -1;

      // Check if dropping on a category directly (for cross-category moves or empty categories)
      targetCatIdx = data.findIndex((c) => c._id === overId);
      if (targetCatIdx !== -1) {
        // Dropping onto a category - put channel at the end of that category
        const targetCategory = data[targetCatIdx];
        const channelToMove = data[sourceCatIdx].channels[sourceChIdx];

        // Build new channel list for target category
        const newChannels = targetCategory.channels
          .filter((ch) => ch._id !== activeId)
          .concat(channelToMove);

        // Optimistic update
        const updated = data.map((cat, i) => {
          if (i === targetCatIdx) return { ...cat, channels: newChannels };
          if (i === sourceCatIdx && sourceCatIdx !== targetCatIdx)
            return { ...cat, channels: cat.channels.filter((ch) => ch._id !== activeId) };
          return cat;
        });
        setLocalData(updated);

        reorderChannels({
          categoryId: targetCategory._id as Id<"channelCategories">,
          channelIds: newChannels.map((ch) => ch._id) as Id<"channels">[],
        });

        // If source category is different, also reorder source to remove the channel
        if (sourceCatIdx !== targetCatIdx) {
          const sourceCategory = data[sourceCatIdx];
          const remainingChannels = sourceCategory.channels.filter(
            (ch) => ch._id !== activeId
          );
          reorderChannels({
            categoryId: sourceCategory._id as Id<"channelCategories">,
            channelIds: remainingChannels.map((ch) => ch._id) as Id<"channels">[],
          });
        }
        return;
      }

      // Dropping on another channel
      for (let ci = 0; ci < data.length; ci++) {
        const chIdx = data[ci].channels.findIndex((ch) => ch._id === overId);
        if (chIdx !== -1) {
          targetCatIdx = ci;
          targetChIdx = chIdx;
          break;
        }
      }
      if (targetCatIdx === -1) return;

      if (sourceCatIdx === targetCatIdx) {
        // Same category - just reorder
        const category = data[sourceCatIdx];
        const newChannels = arrayMove(
          category.channels,
          sourceChIdx,
          targetChIdx
        );

        // Optimistic update
        const updated = data.map((cat, i) =>
          i === sourceCatIdx ? { ...cat, channels: newChannels } : cat
        );
        setLocalData(updated);

        reorderChannels({
          categoryId: category._id as Id<"channelCategories">,
          channelIds: newChannels.map((ch) => ch._id) as Id<"channels">[],
        });
      } else {
        // Cross-category move
        const sourceCategory = data[sourceCatIdx];
        const targetCategory = data[targetCatIdx];
        const channelToMove = sourceCategory.channels[sourceChIdx];

        // Remove from source
        const newSourceChannels = sourceCategory.channels.filter(
          (ch) => ch._id !== activeId
        );
        // Insert into target at the right position
        const newTargetChannels = [...targetCategory.channels];
        newTargetChannels.splice(targetChIdx, 0, channelToMove);

        // Optimistic update
        const updated = data.map((cat, i) => {
          if (i === sourceCatIdx) return { ...cat, channels: newSourceChannels };
          if (i === targetCatIdx) return { ...cat, channels: newTargetChannels };
          return cat;
        });
        setLocalData(updated);

        reorderChannels({
          categoryId: sourceCategory._id as Id<"channelCategories">,
          channelIds: newSourceChannels.map((ch) => ch._id) as Id<"channels">[],
        });
        reorderChannels({
          categoryId: targetCategory._id as Id<"channelCategories">,
          channelIds: newTargetChannels.map((ch) => ch._id) as Id<"channels">[],
        });
      }
    }
  };

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

  // Find active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId || !data) return null;
    if (activeType === "category") {
      return data.find((c) => c._id === activeId) ?? null;
    }
    for (const cat of data) {
      const ch = cat.channels.find((c) => c._id === activeId);
      if (ch) return ch;
    }
    return null;
  }, [activeId, activeType, data]);

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
        className={`flex h-full flex-col border-r border-border bg-sidebar text-sidebar-foreground ${
          isMobileDrawer ? "w-full" : ""
        }`}
        style={isMobileDrawer ? undefined : { width: SIDEBAR_WIDTH }}
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
                className={`flex items-center gap-2.5 rounded-l-[6px] border-r-[3px] px-2.5 py-1.5 text-xs ${
                  isActive
                    ? "border-foreground/30 bg-muted font-medium text-sidebar-foreground"
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
        <div className="flex-1 overflow-y-auto pl-2 pb-2">
          <div className="flex items-center justify-between px-2.5 py-1.5 pr-4.5">
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
              <DotLoader dotCount={5} dotSize={3} gap={4} duration={1400} />
            </div>
          )}

          {isAdmin ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categoryIds}
                strategy={verticalListSortingStrategy}
              >
                {data?.map((category) => (
                  <SortableCategory
                    key={category._id}
                    category={category}
                    isCollapsed={collapsedCategories.has(category._id)}
                    onToggle={() => toggleCategory(category._id)}
                    base={base}
                    pathname={pathname}
                    isAdmin={isAdmin}
                    onEdit={(ch) => setEditingChannel(ch)}
                    onDelete={(ch) => setDeletingChannel(ch)}
                    onEditCategory={() => setEditingCategory({ id: category._id, name: category.name })}
                    onDeleteCategory={() => setDeletingCategory({ id: category._id, name: category.name })}
                    isDraggingChannel={activeType === "channel"}
                    mutedSet={mutedSet}
                    onMuteToggle={async (channelId) => {
                      if (mutedSet.has(channelId)) {
                        await unmuteChannel({ channelId });
                      } else {
                        await muteChannel({ channelId });
                      }
                    }}
                  />
                ))}
              </SortableContext>

              <DragOverlay dropAnimation={null}>
                {activeId && activeItem ? (
                  activeType === "category" ? (
                    <div className="rounded bg-sidebar border border-border shadow-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground opacity-90">
                      {"name" in activeItem && "channels" in activeItem
                        ? (activeItem as { name: string }).name
                        : ""}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 rounded bg-sidebar border border-border shadow-lg px-2.5 py-1.5 text-xs text-sidebar-foreground/60 opacity-90">
                      <Hash size={14} />
                      <span>{"name" in activeItem ? (activeItem as { name: string }).name : ""}</span>
                    </div>
                  )
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            // Non-admin: render without drag-and-drop
            data?.map((category) => {
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
                        const categorySlug = category.name.toLowerCase().replace(/\s+/g, "-");
                        const channelHref = `${base}/c/${categorySlug}/${channel.name}`;
                        const isChannelActive = pathname === channelHref;
                        const IconComponent =
                          channel.channelType === "forum" ? ChatCircle : Hash;
                        const isMuted = mutedSet.has(channel._id);
                        return (
                          <ContextMenu
                            key={channel._id}
                            content={
                              <ContextMenuItem
                                onClick={async () => {
                                  if (isMuted) {
                                    await unmuteChannel({ channelId: channel._id });
                                  } else {
                                    await muteChannel({ channelId: channel._id });
                                  }
                                }}
                              >
                                {isMuted ? <Bell size={14} /> : <BellSlash size={14} />}
                                {isMuted ? "Unmute channel" : "Mute channel"}
                              </ContextMenuItem>
                            }
                          >
                            <Link
                              href={channelHref}
                              className={`group flex items-center gap-2.5 rounded-l-[6px] border-r-[3px] px-2.5 py-1.5 text-xs ${
                                isChannelActive
                                  ? "border-foreground/30 bg-muted font-medium text-sidebar-foreground"
                                  : "border-transparent text-sidebar-foreground/60 hover:bg-muted hover:text-sidebar-foreground"
                              }`}
                            >
                              <IconComponent size={14} className="flex-shrink-0" />
                              <span className="truncate">{channel.name}</span>
                            </Link>
                          </ContextMenu>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

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

      {/* Edit Channel Dialog */}
      <EditChannelDialog
        channel={editingChannel}
        onOpenChange={(open) => !open && setEditingChannel(null)}
        onSave={async (name, description) => {
          if (!editingChannel) return;
          const oldName = editingChannel.name;
          await updateChannel({
            channelId: editingChannel.id,
            name,
            description,
          });
          setEditingChannel(null);
          // If viewing the renamed channel, redirect to the new URL
          if (pathname.endsWith(`/${oldName}`) && pathname.includes(`${base}/c/`)) {
            const newName = name.trim().toLowerCase().replace(/\s+/g, "-");
            const pathPrefix = pathname.substring(0, pathname.lastIndexOf("/"));
            router.push(`${pathPrefix}/${newName}`);
          }
        }}
      />

      {/* Delete Channel Dialog */}
      <DeleteChannelDialog
        channel={deletingChannel}
        onOpenChange={(open) => !open && setDeletingChannel(null)}
        onConfirm={async () => {
          if (!deletingChannel) return;
          const wasActive = pathname.endsWith(`/${deletingChannel.name}`) && pathname.includes(`${base}/c/`);
          await deleteChannel({ channelId: deletingChannel.id });
          setDeletingChannel(null);
          if (wasActive) {
            router.push(base);
          }
        }}
      />

      {/* Edit Category Dialog */}
      <EditCategoryDialog
        category={editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        onSave={async (name) => {
          if (!editingCategory) return;
          const oldSlug = editingCategory.name.toLowerCase().replace(/\s+/g, "-");
          await updateCategoryMutation({ categoryId: editingCategory.id, name });
          setEditingCategory(null);
          // If viewing a channel within the renamed category, redirect
          const newSlug = name.trim().toLowerCase().replace(/\s+/g, "-");
          if (pathname.includes(`${base}/c/${oldSlug}/`) && oldSlug !== newSlug) {
            router.push(pathname.replace(`/c/${oldSlug}/`, `/c/${newSlug}/`));
          }
        }}
      />

      {/* Delete Category Dialog */}
      <DeleteCategoryDialog
        category={deletingCategory}
        firstOtherCategoryName={
          data
            ?.filter((c) => c._id !== deletingCategory?.id)
            .sort((a, b) => (a as { order: number }).order - (b as { order: number }).order)[0]
            ?.name ?? null
        }
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        onConfirm={async () => {
          if (!deletingCategory) return;
          const categorySlug = deletingCategory.name.toLowerCase().replace(/\s+/g, "-");
          const wasActive = pathname.includes(`${base}/c/${categorySlug}/`);
          await deleteCategoryMutation({ categoryId: deletingCategory.id });
          setDeletingCategory(null);
          if (wasActive) {
            router.push(base);
          }
        }}
      />
    </>
  );
}

// --- Sortable components for drag-and-drop ---

interface ChannelItem {
  _id: Id<"channels">;
  name: string;
  description?: string;
  channelType?: "chat" | "forum";
}

interface CategoryItem {
  _id: Id<"channelCategories">;
  name: string;
  channels: ChannelItem[];
}

function SortableCategory({
  category,
  isCollapsed,
  onToggle,
  base,
  pathname,
  isAdmin,
  onEdit,
  onDelete,
  onEditCategory,
  onDeleteCategory,
  isDraggingChannel,
  mutedSet,
  onMuteToggle,
}: {
  category: CategoryItem;
  isCollapsed: boolean;
  onToggle: () => void;
  base: string;
  pathname: string;
  isAdmin: boolean;
  onEdit: (ch: { id: Id<"channels">; name: string; description?: string }) => void;
  onDelete: (ch: { id: Id<"channels">; name: string }) => void;
  onEditCategory: () => void;
  onDeleteCategory: () => void;
  isDraggingChannel: boolean;
  mutedSet: Set<Id<"channels">>;
  onMuteToggle: (channelId: Id<"channels">) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category._id,
    data: { type: "category" },
    // Disable category sorting when dragging a channel
    disabled: isDraggingChannel,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const channelIds = useMemo(
    () => category.channels.map((ch) => ch._id),
    [category.channels]
  );

  const categoryHeader = (
    <div className="group flex w-full items-center">
      <button
        onClick={onToggle}
        className="flex flex-1 items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground"
        {...attributes}
        {...listeners}
      >
        {isCollapsed ? (
          <CaretRight size={12} weight="bold" />
        ) : (
          <CaretDown size={12} weight="bold" />
        )}
        <span className="truncate">{category.name}</span>
      </button>
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger className="mr-3 flex-shrink-0 opacity-0 outline-none group-hover:opacity-100 text-muted-foreground hover:text-sidebar-foreground cursor-pointer">
            <DotsThree size={14} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" sideOffset={4} align="start">
            <DropdownMenuItem onClick={onEditCategory}>
              <PencilSimple size={14} />
              Edit category
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDeleteCategory}
            >
              <Trash size={14} />
              Delete category
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <div ref={setNodeRef} style={style} className="mt-1">
      {isAdmin ? (
        <ContextMenu
          content={
            <>
              <ContextMenuItem onClick={onEditCategory}>
                <PencilSimple size={14} />
                Edit category
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-destructive hover:text-destructive focus:text-destructive"
                onClick={onDeleteCategory}
              >
                <Trash size={14} />
                Delete category
              </ContextMenuItem>
            </>
          }
        >
          {categoryHeader}
        </ContextMenu>
      ) : (
        categoryHeader
      )}

      {!isCollapsed && (
        <SortableContext
          items={channelIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-px">
            {category.channels.map((channel) => (
              <SortableChannel
                key={channel._id}
                channel={channel}
                categorySlug={category.name.toLowerCase().replace(/\s+/g, "-")}
                base={base}
                pathname={pathname}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onDelete={onDelete}
                isMuted={mutedSet.has(channel._id)}
                onMuteToggle={() => onMuteToggle(channel._id)}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

function SortableChannel({
  channel,
  categorySlug,
  base,
  pathname,
  isAdmin,
  onEdit,
  onDelete,
  isMuted,
  onMuteToggle,
}: {
  channel: ChannelItem;
  categorySlug: string;
  base: string;
  pathname: string;
  isAdmin: boolean;
  onEdit: (ch: { id: Id<"channels">; name: string; description?: string }) => void;
  onDelete: (ch: { id: Id<"channels">; name: string }) => void;
  isMuted: boolean;
  onMuteToggle: () => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: channel._id,
    data: { type: "channel" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const channelHref = `${base}/c/${categorySlug}/${channel.name}`;
  const isChannelActive = pathname === channelHref;
  const IconComponent = channel.channelType === "forum" ? ChatCircle : Hash;

  const muteMenuItem = (
    <ContextMenuItem onClick={onMuteToggle}>
      {isMuted ? <Bell size={14} /> : <BellSlash size={14} />}
      {isMuted ? "Unmute channel" : "Mute channel"}
    </ContextMenuItem>
  );

  const channelContextMenu = isAdmin ? (
    <>
      {muteMenuItem}
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() =>
          onEdit({
            id: channel._id,
            name: channel.name,
            description: channel.description,
          })
        }
      >
        <PencilSimple size={14} />
        Edit channel
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className="text-destructive hover:text-destructive focus:text-destructive"
        onClick={() =>
          onDelete({
            id: channel._id,
            name: channel.name,
          })
        }
      >
        <Trash size={14} />
        Delete channel
      </ContextMenuItem>
    </>
  ) : (
    muteMenuItem
  );

  const inner = (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-2.5 rounded-l-[6px] border-r-[3px] px-2.5 py-1.5 text-xs ${
        isChannelActive
          ? "border-foreground/30 bg-muted font-medium text-sidebar-foreground"
          : "border-transparent text-sidebar-foreground/60 hover:bg-muted hover:text-sidebar-foreground"
      }`}
      {...attributes}
      {...listeners}
    >
      {/* Full-area clickable link */}
      <Link
        href={channelHref}
        className="absolute inset-0"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
        aria-label={channel.name}
      />
      <IconComponent size={14} className="flex-shrink-0" />
      <span className="min-w-0 flex-1 truncate">{channel.name}</span>
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`relative z-10 mr-1 flex-shrink-0 opacity-0 outline-none group-hover:opacity-100 ${
              isChannelActive
                ? "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                : "text-muted-foreground hover:text-sidebar-foreground"
            }`}
          >
            <DotsThree size={16} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" sideOffset={4} align="start">
            <DropdownMenuItem
              onClick={() =>
                onEdit({
                  id: channel._id,
                  name: channel.name,
                  description: channel.description,
                })
              }
            >
              <PencilSimple size={14} />
              Edit channel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() =>
                onDelete({
                  id: channel._id,
                  name: channel.name,
                })
              }
            >
              <Trash size={14} />
              Delete channel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return <ContextMenu content={channelContextMenu}>{inner}</ContextMenu>;
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

function EditChannelDialog({
  channel,
  onOpenChange,
  onSave,
}: {
  channel: { id: Id<"channels">; name: string; description?: string } | null;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when channel changes
  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setDescription(channel.description ?? "");
    }
  }, [channel]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onSave(name, description);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={!!channel}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit channel</DialogTitle>
          <DialogDescription>
            Update the name or description of this channel.
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
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
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

function EditCategoryDialog({
  category,
  onOpenChange,
  onSave,
}: {
  category: { id: Id<"channelCategories">; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
    }
  }, [category]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onSave(name);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!category} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription>
            Rename this category.
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
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryDialog({
  category,
  firstOtherCategoryName,
  onOpenChange,
  onConfirm,
}: {
  category: { id: Id<"channelCategories">; name: string } | null;
  firstOtherCategoryName: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!category) {
      setIsDeleting(false);
    }
  }, [category]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!category} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete category</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete the <strong className="text-foreground">{category?.name}</strong> category.
            {firstOtherCategoryName && (
              <> Any channels in this category will be moved to <strong className="text-foreground">{firstOtherCategoryName}</strong>.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete category"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteChannelDialog({
  channel,
  onOpenChange,
  onConfirm,
}: {
  channel: { id: Id<"channels">; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!channel) {
      setConfirmText("");
      setIsDeleting(false);
    }
  }, [channel]);

  const handleDelete = async () => {
    if (confirmText !== channel?.name) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!channel} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete channel</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <strong className="text-foreground">#{channel?.name}</strong> and all
            of its messages. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-1.5">
          <label className="text-xs font-medium">
            Type <span className="font-mono text-destructive">{channel?.name}</span> to confirm
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={channel?.name}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleDelete();
            }}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={confirmText !== channel?.name || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete channel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
