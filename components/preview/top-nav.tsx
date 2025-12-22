"use client"

import Image from "next/image"
import {
  HouseIcon,
  ChatCircleIcon,
  TrayIcon,
  CaretDownIcon,
  CheckIcon,
  PlusIcon,
} from "@phosphor-icons/react"
import { useOrganization, useOrganizationList } from "@clerk/nextjs"
import { UserButton } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

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
  const { organization, isLoaded } = useOrganization()
  const { userMemberships, isLoaded: orgListLoaded, setActive } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  })
  const router = useRouter()

  const handleOrganizationSwitch = async (orgId: string, orgSlug: string | null) => {
    if (!setActive || !orgSlug) return
    
    try {
      await setActive({ organization: orgId })
      router.push(`/${orgSlug}`)
    } catch (error) {
      console.error("Failed to switch organization:", error)
    }
  }

  const handleCreateOrganization = () => {
    router.push("/setup")
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#26251E]/10 bg-[#F7F7F4] px-4">
      {/* Left: Portal Logo */}
      <div className="flex items-center">
        <Image
          src="/portal-full.svg"
          alt="Portal"
          width={100}
          height={24}
          className="h-6 w-auto"
        />
      </div>

      {/* Center: Workspace + Tabs */}
      <div className="flex items-center gap-2">
        {/* Organization Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className="gap-2 px-2 text-[#26251E] hover:bg-[#26251E]/5 h-8 inline-flex items-center justify-center whitespace-nowrap transition-all rounded-md border border-transparent bg-clip-padding focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] outline-none">
            {organization?.imageUrl ? (
              <Image
                src={organization.imageUrl}
                alt={organization.name || "Organization"}
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
            <span className="text-sm font-medium">
              {isLoaded ? (organization?.name || "Organization") : "Loading..."}
            </span>
            <CaretDownIcon className="ml-1 size-3 text-[#26251E]/50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            {orgListLoaded && userMemberships?.data && userMemberships.data.length > 0 ? (
              userMemberships.data.map((membership) => {
                const org = membership.organization
                const isActive = organization?.id === org.id
                return (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => handleOrganizationSwitch(org.id, org.slug)}
                    className="gap-2 px-2 py-1.5 cursor-pointer"
                  >
                    {org.imageUrl ? (
                      <Image
                        src={org.imageUrl}
                        alt={org.name || "Organization"}
                        width={16}
                        height={16}
                        className="rounded"
                      />
                    ) : (
                      <div className="flex h-4 w-4 items-center justify-center rounded bg-[#26251E]">
                        <Image
                          src="/portal.svg"
                          alt="Workspace"
                          width={10}
                          height={10}
                          className="invert"
                        />
                      </div>
                    )}
                    <span className="text-sm flex-1">{org.name || "Organization"}</span>
                    {isActive && (
                      <CheckIcon className="size-3.5 text-[#26251E]" />
                    )}
                  </DropdownMenuItem>
                )
              })
            ) : (
              <DropdownMenuItem disabled className="px-2 py-1.5">
                <span className="text-sm text-[#26251E]/50">No organizations</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleCreateOrganization}
              className="gap-2 px-2 py-1.5 cursor-pointer"
            >
              <PlusIcon className="size-3.5 text-[#26251E]" />
              <span className="text-sm">Create Organization</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mr-2 bg-[#26251E]/10" />

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <Button
                key={tab.id}
                variant={isActive ? "secondary" : "ghost"}
                size="default"
                onClick={() => onTabChange(tab.id)}
                className={`gap-1.5 ${
                  isActive
                    ? "bg-[#26251E]/10 text-[#26251E]"
                    : "text-[#26251E]/70 hover:text-[#26251E]"
                }`}
              >
                <Icon weight={isActive ? "fill" : "regular"} className="size-4" />
                {tab.label}
              </Button>
            )
          })}
        </nav>
      </div>

      {/* Right: User Account */}
      <UserButton
        appearance={{
          elements: {
            rootBox: "h-8",
            avatarBox: "h-8 w-8",
            userButtonPopoverCard: "shadow-lg",
            userButtonPopoverActions: "p-2",
            userButtonPopoverActionButton: "text-[#26251E] hover:bg-[#26251E]/5",
            userButtonPopoverFooter: "hidden",
          },
        }}
      />
    </header>
  )
}

