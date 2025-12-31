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
  TrashIcon,
  PencilIcon,
  LinkIcon,
  SidebarIcon,
  GearIcon,
  DotsSixVerticalIcon,
  WarningCircleIcon,
  CaretLeftIcon,
  PencilSimpleIcon,
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
import { NewDmDialog } from "@/components/messages/new-dm-dialog"
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
import { SidebarShell } from "./sidebar-shell"
// Import split content
import { SidebarMessages } from "./sidebar-messages"
import { SidebarSettingsContent } from "./sidebar-settings-content"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

interface SortableChannelProps {
  channel: {
    _id: Id<"channels">
    name: string
    icon: string
  }
  isActive: boolean
  onSelect: () => void
  onPrefetch?: () => void
  isAdmin: boolean
  onEdit: () => void
  onDelete: () => void
}

function SortableChannel({
  channel,
  isActive,
  onSelect,
  onPrefetch,
  isAdmin,
  onEdit,
  onDelete,
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
        className={`w-full justify-start gap-2 pr-8 ${isActive
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
          } ${isAdmin ? "pl-1" : ""}`}
        style={{
          height: 'auto',
          paddingTop: 'var(--sidebar-item-padding-y)',
          paddingBottom: 'var(--sidebar-item-padding-y)',
          fontSize: 'var(--sidebar-font-size)'
        }}
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
        <span className="truncate">{channel.name}</span>
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
          <DropdownMenuItem>
            <BellIcon className="size-4" />
            Mute channel
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
      <div
        className="group flex items-center pr-2"
        style={{
          paddingTop: 'calc(var(--sidebar-item-padding-y) * 0.5)',
          paddingBottom: 'calc(var(--sidebar-item-padding-y) * 0.5)'
        }}
      >
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
          <span className="uppercase tracking-wider">{category.name}</span>
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
  const isAdmin = membership?.role === "admin"

  // Dialog states
  const [createCategoryOpen, setCreateCategoryOpen] = React.useState(false)
  const [createChannelOpen, setCreateChannelOpen] = React.useState(false)
  const [editChannelId, setEditChannelId] = React.useState<Id<"channels"> | null>(null)
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = React.useState(false)
  const [categoryToDelete, setCategoryToDelete] = React.useState<Id<"channelCategories"> | null>(null)

  // Drag and drop state
  const [activeId, setActiveId] = React.useState<string | null>(null)

  // Messages state
  const [newDmDialogOpen, setNewDmDialogOpen] = React.useState(false)

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

  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([])

  // Expand all categories by default when data loads
  React.useEffect(() => {
    if (categoriesData && expandedCategories.length === 0) {
      setExpandedCategories(categoriesData.map((c) => c._id))
    }
  }, [categoriesData, expandedCategories.length])

  // DETERMINE SIDEBAR MODE
  const isMessagesMode = pathname?.includes("/messages")
  const isSettingsMode = pathname?.includes("/settings")

  // Check current route for active state (channel view)
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

  const isOverviewActive = !activeChannelFromUrl && !isSettingsMode && !isPeoplePage && !isMessagesMode

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

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

  // Navigation handlers for settings/back
  const handleBack = () => {
    if (currentSlug) {
      router.push(`/w/${currentSlug}`)
    }
  }

  const handleNavigateSettings = (section: "workspace" | "customization") => {
    if (currentSlug) {
      router.push(`/w/${currentSlug}/settings/${section}`)
    }
  }

  const handlePrefetchSettings = (section: "workspace" | "customization") => {
    if (currentSlug) {
      router.prefetch(`/w/${currentSlug}/settings/${section}`)
    }
  }

  // --- Dynamic Header Logic ---
  const renderHeader = () => {
    if (isSettingsMode) {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <CaretLeftIcon className="size-4" weight="bold" />
          </Button>
          <h2 className="text-sm font-semibold text-foreground">Settings</h2>
        </div>
      )
    }

    if (isMessagesMode) {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <CaretLeftIcon className="size-4" weight="bold" />
          </Button>
          <h2 className="text-sm font-semibold text-foreground">Messages</h2>
        </div>
      )
    }

    // Default Channel/Org Header
    return (
      <>
        <div className="flex items-center gap-2">
          {currentOrg?.logoUrl ? (
            <Image
              src={currentOrg.logoUrl}
              alt={currentOrg.name || "Organization"}
              width={20}
              height={20}
              className="rounded"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded bg-foreground">
              <Image
                src={isDark ? "/portal.svg" : "/portal-dark.svg"}
                alt="Workspace"
                width={12}
                height={12}
              />
            </div>
          )}
          <span className="text-sm font-medium text-foreground">
            {currentOrg?.name || "Organization"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground"
        >
          <SidebarIcon className="size-4" />
        </Button>
      </>
    )
  }

  // --- Dynamic Footer Logic ---
  const renderFooter = () => {
    if (isSettingsMode) {
      return null // No footer in settings mode
    }

    if (isMessagesMode) {
      return (
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setNewDmDialogOpen(true)}
        >
          <PencilSimpleIcon className="size-4" />
          New Message
        </Button>
      )
    }

    // Default Channel/Org Footer
    return isAdmin ? (
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
    ) : null
  }


  return (
    <SidebarShell
      isOpen={isOpen}
      onToggle={onToggle}
      header={renderHeader()}
      footer={renderFooter()}
    >
      {/* Messages Mode */}
      {isMessagesMode && (
        <SidebarMessages />
      )}

      {/* Settings Mode */}
      {isSettingsMode && (
        <SidebarSettingsContent
          isAdmin={isAdmin}
          isWorkspaceActive={pathname?.includes("/settings/workspace") || false}
          isCustomizationActive={pathname?.includes("/settings/customization") || false}
          handleNavigate={handleNavigateSettings}
          handlePrefetch={handlePrefetchSettings}
        />
      )}

      {/* Channels/Default Mode */}
      {!isMessagesMode && !isSettingsMode && (
        <div className="space-y-4">
          {/* Sidebar Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sidebar-gap)' }}>
            {/* Overview button */}
            <Link
              href={currentSlug ? `/w/${currentSlug}` : "#"}
              className="block"
              onMouseEnter={handleOverviewPrefetch}
            >
              <Button
                variant={isOverviewActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-2 ${isOverviewActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                style={{
                  height: 'auto',
                  paddingTop: 'var(--sidebar-item-padding-y)',
                  paddingBottom: 'var(--sidebar-item-padding-y)',
                  fontSize: 'var(--sidebar-font-size)'
                }}
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
                className={`w-full justify-start gap-2 ${isPeoplePage
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                style={{
                  height: 'auto',
                  paddingTop: 'var(--sidebar-item-padding-y)',
                  paddingBottom: 'var(--sidebar-item-padding-y)',
                  fontSize: 'var(--sidebar-font-size)'
                }}
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
                  variant={isSettingsMode ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-2 ${isSettingsMode
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  style={{
                    height: 'auto',
                    paddingTop: 'var(--sidebar-item-padding-y)',
                    paddingBottom: 'var(--sidebar-item-padding-y)',
                    fontSize: 'var(--sidebar-font-size)'
                  }}
                >
                  <GearIcon
                    className="size-4"
                    weight={isSettingsMode ? "fill" : "regular"}
                  />
                  Settings
                </Button>
              </Link>
            )}
          </div>

          {/* Categories and Channels with DnD */}
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
                        <span className="truncate">{activeCategory.name}</span>
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
                          <span className="truncate">{activeChannel.name}</span>
                        </div>
                      </div>
                    )
                  }
                }

                return null
              })() : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Dialogs outside of SidebarShell to avoid scroll interference */}
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
          <NewDmDialog
            open={newDmDialogOpen}
            onOpenChange={setNewDmDialogOpen}
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
    </SidebarShell>
  )
}
