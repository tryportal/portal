"use client"

import Image from "next/image"
import {
  HouseIcon,
  ChatCircleIcon,
  TrayIcon,
  CaretDownIcon,
  CheckIcon,
  PlusIcon,
  ListIcon,
} from "@phosphor-icons/react"
import { UserButton } from "@clerk/nextjs"
import { useRouter, useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useWorkspaceData, useWorkspace } from "@/components/workspace-context"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"

interface TopNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: "home", label: "Home", icon: HouseIcon },
  { id: "messages", label: "Messages", icon: ChatCircleIcon },
  { id: "inbox", label: "Inbox", icon: TrayIcon },
]

export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  const router = useRouter()
  const params = useParams()
  const currentSlug = params?.slug as string | undefined

  // Use shared workspace data from context
  const { organization: currentOrg, userOrganizations: userOrgs } = useWorkspaceData()
  const { sidebarOpen, setSidebarOpen } = useWorkspace()

  // Get total unread message count for DMs
  const totalUnreadCount = useQuery(api.conversations.getTotalUnreadCount) ?? 0

  // Get total inbox count (mentions + DMs)
  const inboxCount = useQuery(
    api.messages.getTotalInboxCount,
    currentOrg?._id ? { organizationId: currentOrg._id } : "skip"
  )

  const handleOrganizationSwitch = (orgSlug: string) => {
    router.push(`/w/${orgSlug}`)
  }

  const handleCreateOrganization = () => {
    router.push("/setup?new=true")
  }

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId)
    
    // Navigate based on tab
    if (currentSlug) {
      if (tabId === "home") {
        router.push(`/w/${currentSlug}`)
      } else if (tabId === "messages") {
        router.push(`/w/${currentSlug}/messages`)
      } else if (tabId === "inbox") {
        router.push(`/w/${currentSlug}/inbox`)
      }
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-3 sm:px-4 sm:grid sm:grid-cols-3">
      {/* Left: Mobile menu button + Portal Logo */}
      <div className="flex items-center gap-2">
        {/* Mobile sidebar toggle - only show when sidebar would be visible (not on messages) */}
        {activeTab !== "messages" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sm:hidden text-muted-foreground hover:text-foreground"
            >
              <ListIcon className="size-5" weight="bold" />
            </Button>
        )}
        <Image
          src="/portal-full.svg"
          alt="Portal"
          width={100}
          height={21}
          className="h-5 sm:h-[21px] w-auto hidden sm:block"
        />
        {/* Mobile: Show org name instead of logo */}
        <div className="sm:hidden flex items-center gap-1.5">
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
                src="/portal.svg"
                alt="Workspace"
                width={12}
                height={12}
                className="invert dark:invert-0"
              />
            </div>
          )}
          <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
            {currentOrg?.name || "Portal"}
          </span>
        </div>
      </div>

      {/* Center: Workspace + Tabs (hidden on mobile, shown in bottom nav) */}
      <div className="hidden sm:flex items-center justify-center gap-2">
        {/* Organization Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className="gap-2 px-2 text-foreground hover:bg-muted h-8 inline-flex items-center justify-center whitespace-nowrap transition-all rounded-md border border-transparent bg-clip-padding focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] outline-none">
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
                  src="/portal.svg"
                  alt="Workspace"
                  width={12}
                  height={12}
                  className="invert dark:invert-0"
                />
              </div>
            )}
            <span className="text-sm font-medium">
              {currentOrg?.name || "Organization"}
            </span>
            <CaretDownIcon className="ml-1 size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            {userOrgs && userOrgs.length > 0 ? (
              userOrgs.map((org) => {
                const isActive = currentOrg?._id === org._id
                return (
                  <DropdownMenuItem
                    key={org._id}
                    onClick={() => handleOrganizationSwitch(org.slug)}
                    className="gap-2 px-2 py-1.5 cursor-pointer"
                  >
                    {org.logoUrl ? (
                      <Image
                        src={org.logoUrl}
                        alt={org.name || "Organization"}
                        width={16}
                        height={16}
                        className="rounded"
                      />
                    ) : (
                      <div className="flex h-4 w-4 items-center justify-center rounded bg-foreground">
                        <Image
                          src="/portal.svg"
                          alt="Workspace"
                          width={10}
                          height={10}
                          className="invert dark:invert-0"
                        />
                      </div>
                    )}
                    <span className="text-sm flex-1">{org.name || "Organization"}</span>
                    {isActive && (
                      <CheckIcon className="size-3.5 text-foreground" />
                    )}
                  </DropdownMenuItem>
                )
              })
            ) : (
              <DropdownMenuItem disabled className="px-2 py-1.5">
                <span className="text-sm text-muted-foreground">No organizations</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleCreateOrganization}
              className="gap-2 px-2 py-1.5 cursor-pointer"
            >
              <PlusIcon className="size-3.5 text-foreground" />
              <span className="text-sm">Create Organization</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

          <Separator orientation="vertical" className="mr-2 bg-border" />

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const showMessagesBadge = tab.id === "messages" && totalUnreadCount > 0
            const showInboxBadge = tab.id === "inbox" && (inboxCount?.total ?? 0) > 0
            const badgeCount = tab.id === "messages" ? totalUnreadCount : (inboxCount?.total ?? 0)
              return (
              <Button
                key={tab.id}
                variant={isActive ? "secondary" : "ghost"}
                size="default"
                onClick={() => handleTabChange(tab.id)}
                className={`gap-1.5 relative ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon weight={isActive ? "fill" : "regular"} className="size-4" />
                {tab.label}
                {(showMessagesBadge || showInboxBadge) && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Button>
            )
          })}
        </nav>
      </div>

      {/* Right: Theme Toggle + User Account */}
      <div className="flex justify-end items-center gap-2">
        <ThemeToggle variant="icon" className="hidden sm:flex" />
        <UserButton
        appearance={{
          elements: {
            rootBox: "h-8",
            avatarBox: "h-7 w-7 sm:h-8 sm:w-8",
            userButtonPopoverCard: "shadow-lg",
            userButtonPopoverActions: "p-2",
            userButtonPopoverActionButton: "text-foreground hover:bg-muted",
            userButtonPopoverFooter: "hidden",
          },
        }}
        />
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background px-2 py-1 safe-area-pb">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const showMessagesBadge = tab.id === "messages" && totalUnreadCount > 0
            const showInboxBadge = tab.id === "inbox" && (inboxCount?.total ?? 0) > 0
            const badgeCount = tab.id === "messages" ? totalUnreadCount : (inboxCount?.total ?? 0)
              return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon weight={isActive ? "fill" : "regular"} className="size-5" />
                  {(showMessagesBadge || showInboxBadge) && (
                    <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-semibold text-white">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
