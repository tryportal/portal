"use client"

import * as React from "react"
import Image from "next/image"
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
} from "@phosphor-icons/react"
import { useQuery } from "convex/react"
import { useParams, useRouter, usePathname } from "next/navigation"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Channel {
  id: string
  name: string
  icon?: React.ElementType
}

interface Category {
  id: string
  name: string
  channels: Channel[]
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  activeChannel: string
  onChannelSelect: (channelId: string | null) => void
  categories: Category[]
}

export function Sidebar({
  isOpen,
  onToggle,
  activeChannel,
  onChannelSelect,
  categories,
}: SidebarProps) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const currentSlug = params?.slug as string | undefined

  // Get current organization by slug
  const currentOrg = useQuery(
    api.organizations.getOrganizationBySlug,
    currentSlug ? { slug: currentSlug } : "skip"
  )

  // Get user's membership to check if they're an admin
  const membership = useQuery(
    api.organizations.getUserMembership,
    currentOrg?._id ? { organizationId: currentOrg._id } : "skip"
  )

  const [expandedCategories, setExpandedCategories] = React.useState<string[]>(
    categories.map((c) => c.id)
  )

  // Check if we're on the settings page
  const isSettingsPage = pathname?.endsWith("/settings") || pathname?.endsWith("/settings/")
  
  // Check if we're on the people page
  const isPeoplePage = pathname?.includes("/people")
  
  // Check if overview is active (no channel selected and not on settings or people page)
  const isOverviewActive = !activeChannel && !isSettingsPage && !isPeoplePage

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const isAdmin = membership?.role === "admin"

  if (!isOpen) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-[#26251E]/10 bg-[#F7F7F4] py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-[#26251E]/70 hover:text-[#26251E]"
        >
          <SidebarIcon className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full w-60 flex-col border-r border-[#26251E]/10 bg-[#F7F7F4]">
      {/* Header with toggle */}
      <div className="flex h-12 items-center justify-between border-b border-[#26251E]/10 px-3">
        <div className="flex items-center gap-2">
          {currentOrg?.imageUrl ? (
            <Image
              src={currentOrg.imageUrl}
              alt={currentOrg.name || "Organization"}
              width={20}
              height={20}
              className="rounded"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded bg-[#26251E]">
              <Image
                src="/portal.svg"
                alt="Workspace"
                width={12}
                height={12}
                className="invert"
              />
            </div>
          )}
          <span className="text-sm font-medium text-[#26251E]">
            {currentOrg?.name || "Organization"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-[#26251E]/50 hover:text-[#26251E]"
        >
          <SidebarIcon className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Sidebar Tabs */}
          <div className="mb-4 space-y-0.5">
            {/* Overview button */}
            <Button
              variant={isOverviewActive ? "secondary" : "ghost"}
              onClick={() => {
                onChannelSelect(null)
                if (currentSlug && (isSettingsPage || isPeoplePage)) {
                  router.push(`/${currentSlug}`)
                }
              }}
              className={`w-full justify-start gap-2 ${
                isOverviewActive
                  ? "bg-[#26251E]/10 text-[#26251E]"
                  : "text-[#26251E]/80 hover:bg-[#26251E]/5 hover:text-[#26251E]"
              }`}
            >
              <ChartBarIcon className="size-4" weight={isOverviewActive ? "fill" : "regular"} />
              Overview
            </Button>
            {/* People button */}
            <Button
              variant={isPeoplePage ? "secondary" : "ghost"}
              onClick={() => {
                if (currentSlug) {
                  router.push(`/${currentSlug}/people`)
                }
              }}
              className={`w-full justify-start gap-2 ${
                isPeoplePage
                  ? "bg-[#26251E]/10 text-[#26251E]"
                  : "text-[#26251E]/80 hover:bg-[#26251E]/5 hover:text-[#26251E]"
              }`}
            >
              <UsersIcon className="size-4" weight={isPeoplePage ? "fill" : "regular"} />
              People
            </Button>
            {/* Settings button for admins */}
            {isAdmin && (
              <Button
                variant={isSettingsPage ? "secondary" : "ghost"}
                onClick={() => {
                  if (currentSlug) {
                    router.push(`/${currentSlug}/settings`)
                  }
                }}
                className={`w-full justify-start gap-2 ${
                  isSettingsPage
                    ? "bg-[#26251E]/10 text-[#26251E]"
                    : "text-[#26251E]/80 hover:bg-[#26251E]/5 hover:text-[#26251E]"
                }`}
              >
                <GearIcon className="size-4" weight={isSettingsPage ? "fill" : "regular"} />
                Settings
              </Button>
            )}
          </div>

          {/* Categories and Channels */}
          <div className="space-y-2">
            {categories.map((category) => {
              const isExpanded = expandedCategories.includes(category.id)
              return (
                <div key={category.id}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="group flex w-full items-center gap-1 rounded px-1 py-1 text-xs font-medium text-[#26251E]/60 hover:text-[#26251E]"
                  >
                    {isExpanded ? (
                      <CaretDownIcon className="size-3" />
                    ) : (
                      <CaretRightIcon className="size-3" />
                    )}
                    <span className="uppercase tracking-wider">
                      {category.name}
                    </span>
                  </button>

                  {/* Channels */}
                  {isExpanded && (
                    <div className="mt-0.5 space-y-0.5 pl-1">
                      {category.channels.map((channel) => {
                        const Icon = channel.icon || HashIcon
                        const isActive = activeChannel === channel.id
                        return (
                          <div
                            key={channel.id}
                            className="group relative"
                          >
                            <Button
                              variant={isActive ? "secondary" : "ghost"}
                              className={`w-full justify-start gap-2 pr-8 ${
                                isActive
                                  ? "bg-[#26251E]/10 text-[#26251E]"
                                  : "text-[#26251E]/70 hover:bg-[#26251E]/5 hover:text-[#26251E]"
                              }`}
                              onClick={() => onChannelSelect(channel.id)}
                            >
                              <Icon className="size-4" weight={isActive ? "fill" : "regular"} />
                              <span className="truncate">{channel.name}</span>
                            </Button>

                            {/* More button on hover */}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={<Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[#26251E]/50 hover:text-[#26251E]"
                                />}
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
                                <DropdownMenuItem>
                                  <PencilIcon className="size-4" />
                                  Edit channel
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive">
                                  <TrashIcon className="size-4" />
                                  Delete channel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Bottom: Create button */}
      <div className="border-t border-[#26251E]/5 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button
              variant="ghost"
              className="w-full justify-start gap-2 text-[#26251E]/60 hover:text-[#26251E]"
            />}
          >
            <PlusIcon className="size-4" />
            Create new
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem>
              <HashIcon className="size-4" />
              New channel
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FolderIcon className="size-4" />
              New category
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </div>
  )
}
