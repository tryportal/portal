"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ChartBarIcon,
  UsersIcon,
  HashIcon,
  DotsThreeIcon,
  PlusIcon,
  CaretDownIcon,
  CaretRightIcon,
  FolderIcon,
  BellIcon,
  BellSlashIcon,
  TrashIcon,
  PencilIcon,
  LinkIcon,
  SidebarIcon,
  GearIcon,
  DotsSixVerticalIcon,
  WarningCircleIcon,
  LockIcon,
} from "@phosphor-icons/react"
import { useQuery, useMutation } from "convex/react"
import { useParams, useRouter, usePathname } from "next/navigation"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useWorkspaceData } from "@/components/workspace-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CreateCategoryDialog } from "@/components/create-category-dialog"
import { CreateChannelDialog } from "@/components/create-channel-dialog"
import { EditChannelDialog } from "@/components/edit-channel-dialog"
import { getIconComponent } from "@/components/icon-picker"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useTheme } from "@/lib/theme-provider"
import { ResizableSidebar } from "@/components/ui/resizable-sidebar"
import { LoadingSpinner } from "@/components/loading-spinner"

const SIDEBAR_STORAGE_KEY = "portal-sidebar-width"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

interface SortableChannelProps {
  channel: {
    _id: Id<"channels">
    name: string
    icon: string
    isPrivate?: boolean
  }
  isActive: boolean
  onSelect: () => void
  onPrefetch?: () => void
  isAdmin: boolean
  onEdit: () => void
  onDelete: () => void
  isMuted: boolean
  onMuteToggle: () => void
}

function SortableChannel({
  channel,
  isActive,
  onSelect,
  onPrefetch,
  isAdmin,
  onEdit,
  onDelete,
  isMuted,
  onMuteToggle,
}: SortableChannelProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channel._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const Icon = getIconComponent(channel.icon)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative"
      onMouseEnter={onPrefetch}
    >
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={`w-full justify-start gap-2 pr-8 ${
          isActive
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        } ${isAdmin ? "pl-1" : ""} ${isMuted ? "opacity-60" : ""}`}
        onClick={onSelect}
      >
        {isAdmin && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-muted-foreground"
          >
            <DotsSixVerticalIcon className="size-4" />
          </span>
        )}
        {React.createElement(Icon, {
          className: "size-4",
          weight: isActive ? "fill" : "regular",
        })}
        <span className="truncate min-w-0">{channel.name}</span>
        {channel.isPrivate && (
          <LockIcon className="size-3 text-muted-foreground shrink-0" weight="bold" />
        )}
        {isMuted && (
          <BellSlashIcon className="size-3 text-muted-foreground shrink-0" weight="bold" />
        )}
      </Button>

      {/* More button on hover */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
            />
          }
        >
          <DotsThreeIcon className="size-4" weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={onMuteToggle}>
            {isMuted ? (
              <>
                <BellIcon className="size-4" />
                Unmute channel
              </>
            ) : (
              <>
                <BellSlashIcon className="size-4" />
                Mute channel
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <LinkIcon className="size-4" />
            Copy link
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuItem onClick={onEdit}>
                <PencilIcon className="size-4" />
                Edit channel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <TrashIcon className="size-4" />
                Delete channel
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface SortableCategoryProps {
  category: {
    _id: Id<"channelCategories">
    name: string
    channels: Array<{
      _id: Id<"channels">
      name: string
      icon: string
      isPrivate?: boolean
    }>
  }
  isExpanded: boolean
  onToggle: () => void
  activeChannelId: string | null
  onChannelSelect: (channelId: string, categoryName: string, channelName: string) => void
  onChannelPrefetch: (categoryName: string, channelName: string) => void
  isAdmin: boolean
  onEditChannel: (channelId: Id<"channels">) => void
  onDeleteChannel: (channelId: Id<"channels">) => void
  onDeleteCategory: (categoryId: Id<"channelCategories">) => void
  mutedChannelIds: Set<string>
  onMuteToggle: (channelId: Id<"channels">) => void
}

function SortableCategory({
  category,
  isExpanded,
  onToggle,
  activeChannelId,
  onChannelSelect,
  onChannelPrefetch,
  isAdmin,
  onEditChannel,
  onDeleteChannel,
  onDeleteCategory,
  mutedChannelIds,
  onMuteToggle,
}: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Category Header */}
      <div className="group flex items-center pr-2">
        {isAdmin && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-muted-foreground p-1"
          >
            <DotsSixVerticalIcon className="size-3" />
          </span>
        )}
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-1 rounded px-1 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <CaretDownIcon className="size-3" />
          ) : (
            <CaretRightIcon className="size-3" />
          )}
          <span className="uppercase tracking-wider truncate">{category.name}</span>
        </button>
        
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted" />
              }
            >
              <DotsThreeIcon className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={() => onDeleteCategory(category._id)}
              >
                <TrashIcon className="size-4 mr-2" />
                Delete Category
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Channels */}
      {isExpanded && (
        <div className="mt-0.5 space-y-0.5 pl-1">
          <SortableContext
            items={category.channels.map((c) => c._id)}
            strategy={verticalListSortingStrategy}
          >
            {category.channels.map((channel) => (
              <SortableChannel
                key={channel._id}
                channel={channel}
                isActive={activeChannelId === channel._id}
                onSelect={() => onChannelSelect(channel._id, category.name, channel.name)}
                onPrefetch={() => onChannelPrefetch(category.name, channel.name)}
                isAdmin={isAdmin}
                onEdit={() => onEditChannel(channel._id)}
                onDelete={() => onDeleteChannel(channel._id)}
                isMuted={mutedChannelIds.has(channel._id)}
                onMuteToggle={() => onMuteToggle(channel._id)}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  )
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const currentSlug = params?.slug as string | undefined
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // Use shared workspace data from context
  const { organization: currentOrg, membership } = useWorkspaceData()

  // Dialog states
  const [createCategoryOpen, setCreateCategoryOpen] = React.useState(false)
  const [createChannelOpen, setCreateChannelOpen] = React.useState(false)
  const [editChannelId, setEditChannelId] = React.useState<Id<"channels"> | null>(null)
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = React.useState(false)
  const [categoryToDelete, setCategoryToDelete] = React.useState<Id<"channelCategories"> | null>(null)

  // Drag and drop state
  const [activeId, setActiveId] = React.useState<string | null>(null)

  // Get categories and channels from Convex (this is still needed per-sidebar)
  const categoriesData = useQuery(
    api.channels.getCategoriesAndChannels,
    currentOrg?._id ? { organizationId: currentOrg._id } : "skip"
  )

  // Mutations for reordering and deleting
  const reorderCategories = useMutation(api.channels.reorderCategories)
  const reorderChannels = useMutation(api.channels.reorderChannels)
  const deleteChannel = useMutation(api.channels.deleteChannel)
  const deleteCategory = useMutation(api.channels.deleteCategory)

  // Mute/unmute mutations
  const muteChannel = useMutation(api.channels.muteChannel)
  const unmuteChannel = useMutation(api.channels.unmuteChannel)

  // Query muted channels
  const mutedChannels = useQuery(
    api.channels.getMutedChannels,
    currentOrg?._id ? { organizationId: currentOrg._id } : "skip"
  )

  // Create a Set for efficient lookup
  // Create a Set for efficient lookup
  const mutedChannelIds = React.useMemo(
    () => new Set(mutedChannels || []),
    [mutedChannels]
  )

  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([])

  // Expand all categories by default when data loads
  React.useEffect(() => {
    if (categoriesData && expandedCategories.length === 0) {
      setExpandedCategories(categoriesData.map((c) => c._id))
    }
  }, [categoriesData, expandedCategories.length])

  // Check current route for active state
  const isSettingsPage =
    pathname?.endsWith("/settings") || pathname?.endsWith("/settings/")
  const isPeoplePage = pathname?.includes("/people")

  // Parse active channel from URL
  const activeChannelFromUrl = React.useMemo(() => {
    if (!pathname || !currentSlug) return null
    const parts = pathname.split("/").filter(Boolean)
    if (parts.length >= 4 && parts[0] === "w" && parts[1] === currentSlug) {
      // URL format: /w/slug/category/channel
      const categoryName = decodeURIComponent(parts[2])
      const channelName = decodeURIComponent(parts[3])
      // Find matching channel
      for (const category of categoriesData || []) {
        if (category.name.toLowerCase() === categoryName.toLowerCase()) {
          for (const channel of category.channels) {
            if (channel.name.toLowerCase() === channelName.toLowerCase()) {
              return channel._id
            }
          }
        }
      }
    }
    return null
  }, [pathname, currentSlug, categoriesData])

  const isOverviewActive = !activeChannelFromUrl && !isSettingsPage && !isPeoplePage

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const isAdmin = membership?.role === "admin"

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event

    if (!over || active.id === over.id || !currentOrg?._id) return

    // Check if it's a category drag
    const activeCategory = categoriesData?.find((c) => c._id === active.id)
    const overCategory = categoriesData?.find((c) => c._id === over.id)

    if (activeCategory && overCategory) {
      // Reorder categories
      const oldIndex = categoriesData!.findIndex((c) => c._id === active.id)
      const newIndex = categoriesData!.findIndex((c) => c._id === over.id)

      const newOrder = [...categoriesData!]
      const [removed] = newOrder.splice(oldIndex, 1)
      newOrder.splice(newIndex, 0, removed)

      await reorderCategories({
        organizationId: currentOrg._id,
        categoryIds: newOrder.map((c) => c._id),
      })
      return
    }

    // Check if it's a channel drag within the same category
    for (const category of categoriesData || []) {
      const activeChannel = category.channels.find((c) => c._id === active.id)
      const overChannel = category.channels.find((c) => c._id === over.id)

      if (activeChannel && overChannel) {
        const oldIndex = category.channels.findIndex((c) => c._id === active.id)
        const newIndex = category.channels.findIndex((c) => c._id === over.id)

        const newOrder = [...category.channels]
        const [removed] = newOrder.splice(oldIndex, 1)
        newOrder.splice(newIndex, 0, removed)

        await reorderChannels({
          categoryId: category._id,
          channelIds: newOrder.map((c) => c._id),
        })
        return
      }
    }
  }

  const handleChannelSelect = (
    channelId: string,
    categoryName: string,
    channelName: string
  ) => {
    if (currentSlug) {
      const encodedCategory = encodeURIComponent(categoryName.toLowerCase())
      const encodedChannel = encodeURIComponent(channelName.toLowerCase())
      router.push(`/w/${currentSlug}/${encodedCategory}/${encodedChannel}`)
    }
  }

  // Prefetch channel on hover for faster navigation
  const handleChannelPrefetch = (categoryName: string, channelName: string) => {
    if (currentSlug) {
      const encodedCategory = encodeURIComponent(categoryName.toLowerCase())
      const encodedChannel = encodeURIComponent(channelName.toLowerCase())
      router.prefetch(`/w/${currentSlug}/${encodedCategory}/${encodedChannel}`)
    }
  }

  // Prefetch sidebar navigation routes on hover for faster navigation
  const handleOverviewPrefetch = () => {
    if (currentSlug) {
      router.prefetch(`/w/${currentSlug}`)
    }
  }

  const handlePeoplePrefetch = () => {
    if (currentSlug) {
      router.prefetch(`/w/${currentSlug}/people`)
    }
  }

  const handleSettingsPrefetch = () => {
    if (currentSlug) {
      router.prefetch(`/w/${currentSlug}/settings`)
    }
  }

  const handleEditChannel = (channelId: Id<"channels">) => {
    setEditChannelId(channelId)
  }

  const handleDeleteChannel = async (channelId: Id<"channels">) => {
    try {
      await deleteChannel({ channelId })
    } catch (error) {
      console.error("Failed to delete channel:", error)
    }
  }

  const handleDeleteCategory = (categoryId: Id<"channelCategories">) => {
    setCategoryToDelete(categoryId)
    setDeleteCategoryDialogOpen(true)
  }

  const handleMuteToggle = async (channelId: Id<"channels">) => {
    try {
      if (mutedChannelIds.has(channelId)) {
        await unmuteChannel({ channelId })
      } else {
        await muteChannel({ channelId })
      }
    } catch (error) {
      console.error("Failed to toggle channel mute:", error)
    }
  }

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      await deleteCategory({ categoryId: categoryToDelete })
      setDeleteCategoryDialogOpen(false)
      setCategoryToDelete(null)
    } catch (error) {
      console.error("Failed to delete category:", error)
      // Error handling can be improved with a toast notification system
    }
  }

  if (!isOpen) {
    return (
      <div className="hidden sm:flex h-full w-12 flex-col items-center border-r border-border bg-background py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground"
        >
          <SidebarIcon className="size-4" />
        </Button>
      </div>
    )
  }

  // Shared sidebar content for both mobile and desktop
  const sidebarContent = (
    <>
      {/* Header with toggle */}
      <div className="flex h-12 items-center justify-between border-b border-border bg-background px-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {currentOrg?.logoUrl ? (
            <Image
              src={currentOrg.logoUrl}
              alt={currentOrg.name || "Organization"}
              width={20}
              height={20}
              className="rounded shrink-0"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded bg-foreground shrink-0">
              <Image
                src={isDark ? "/portal.svg" : "/portal-dark.svg"}
                alt="Workspace"
                width={12}
                height={12}
              />
            </div>
          )}
          <span className="text-sm font-medium text-foreground truncate min-w-0">
            {currentOrg?.name || "Organization"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <SidebarIcon className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Sidebar Tabs */}
          <div className="mb-4 space-y-0.5">
            {/* Overview button */}
            <Link
              href={currentSlug ? `/w/${currentSlug}` : "#"}
              className="block"
              onMouseEnter={handleOverviewPrefetch}
            >
              <Button
                variant={isOverviewActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-2 ${
                  isOverviewActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <ChartBarIcon
                  className="size-4"
                  weight={isOverviewActive ? "fill" : "regular"}
                />
                Overview
              </Button>
            </Link>
            {/* People button */}
            <Link
              href={currentSlug ? `/w/${currentSlug}/people` : "#"}
              className="block"
              onMouseEnter={handlePeoplePrefetch}
            >
              <Button
                variant={isPeoplePage ? "secondary" : "ghost"}
                className={`w-full justify-start gap-2 ${
                  isPeoplePage
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <UsersIcon
                  className="size-4"
                  weight={isPeoplePage ? "fill" : "regular"}
                />
                People
              </Button>
            </Link>
            {/* Settings button for admins */}
            {isAdmin && (
              <Link
                href={currentSlug ? `/w/${currentSlug}/settings` : "#"}
                className="block"
                onMouseEnter={handleSettingsPrefetch}
              >
                <Button
                  variant={isSettingsPage ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-2 ${
                    isSettingsPage
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <GearIcon
                    className="size-4"
                    weight={isSettingsPage ? "fill" : "regular"}
                  />
                  Settings
                </Button>
              </Link>
            )}
          </div>

          {/* Categories and Channels with DnD */}
          {categoriesData === undefined ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-2">
              <SortableContext
                items={categoriesData?.map((c) => c._id) || []}
                strategy={verticalListSortingStrategy}
              >
                {categoriesData?.map((category) => (
                  <SortableCategory
                    key={category._id}
                    category={category}
                    isExpanded={expandedCategories.includes(category._id)}
                    onToggle={() => toggleCategory(category._id)}
                    activeChannelId={activeChannelFromUrl}
                    onChannelSelect={handleChannelSelect}
                    onChannelPrefetch={handleChannelPrefetch}
                    isAdmin={isAdmin}
                    onEditChannel={handleEditChannel}
                    onDeleteChannel={handleDeleteChannel}
                    onDeleteCategory={handleDeleteCategory}
                    mutedChannelIds={mutedChannelIds}
                    onMuteToggle={handleMuteToggle}
                  />
                ))}
              </SortableContext>
            </div>
            <DragOverlay>
              {activeId ? (() => {
                // Check if dragging a category
                const activeCategory = categoriesData?.find((c) => c._id === activeId)
                if (activeCategory) {
                  return (
                    <div className="rounded-md bg-card border-2 border-primary/50 shadow-xl px-3 py-2 min-w-[200px] opacity-95">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FolderIcon className="size-4 text-primary" weight="fill" />
                        <span className="truncate min-w-0">{activeCategory.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {activeCategory.channels.length}
                        </span>
                      </div>
                    </div>
                  )
                }

                // Check if dragging a channel
                for (const category of categoriesData || []) {
                  const activeChannel = category.channels.find((c) => c._id === activeId)
                  if (activeChannel) {
                    const IconComponent = getIconComponent(activeChannel.icon)
                    
                    return (
                      <div className="rounded-md bg-card border-2 border-primary/50 shadow-xl px-3 py-2 min-w-[180px] opacity-95">
                        <div className="flex items-center gap-2 text-sm">
                          <IconComponent className="size-4 text-muted-foreground" weight="bold" />
                          <span className="truncate min-w-0">{activeChannel.name}</span>
                        </div>
                      </div>
                    )
                  }
                }

                return null
              })() : null}
            </DragOverlay>
          </DndContext>
          )}
        </div>
      </ScrollArea>

      {/* Bottom: Create button */}
      {isAdmin && (
        <div className="border-t border-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                />
              }
            >
              <PlusIcon className="size-4" />
              Create new
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem 
                onClick={() => setCreateChannelOpen(true)}
                disabled={!categoriesData || categoriesData.length === 0}
                className={(!categoriesData || categoriesData.length === 0) ? "opacity-50 cursor-not-allowed" : ""}
              >
                <HashIcon className="size-4" />
                New channel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateCategoryOpen(true)}>
                <FolderIcon className="size-4" />
                New category
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </>
  )

  return (
    <>
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <div
            className="sm:hidden fixed inset-0 bg-black/50 z-40"
            onClick={onToggle}
          />

          {/* Mobile Sidebar - fixed width, slides in */}
          <div className="sm:hidden fixed z-50 h-full w-60 flex-col border-r border-border bg-background flex animate-in slide-in-from-left-full duration-200">
            {sidebarContent}
          </div>
        </>
      )}
      {/* Desktop Sidebar - resizable */}
      <ResizableSidebar
        storageKey={SIDEBAR_STORAGE_KEY}
        defaultWidth={240}
        minWidth={180}
        maxWidth={400}
        className="h-full border-r border-border bg-background"
      >
        {sidebarContent}
      </ResizableSidebar>

      {/* Dialogs */}
      {currentOrg?._id && (
        <>
          <CreateCategoryDialog
            open={createCategoryOpen}
            onOpenChange={setCreateCategoryOpen}
            organizationId={currentOrg._id}
          />
          <CreateChannelDialog
            open={createChannelOpen}
            onOpenChange={setCreateChannelOpen}
            organizationId={currentOrg._id}
          />
          <EditChannelDialog
            open={editChannelId !== null}
            onOpenChange={(open) => {
              if (!open) setEditChannelId(null)
            }}
            channelId={editChannelId}
            organizationId={currentOrg._id}
          />
          <AlertDialog 
            open={deleteCategoryDialogOpen} 
            onOpenChange={(open) => {
              setDeleteCategoryDialogOpen(open)
              if (!open) {
                setCategoryToDelete(null)
              }
            }}
          >
            <AlertDialogContent size="default" className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-red-50 text-red-600">
                  <WarningCircleIcon className="size-5" weight="fill" />
                </AlertDialogMedia>
                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this category? This will permanently delete the category and all channels within it. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteCategory}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Delete Category
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  )
}
