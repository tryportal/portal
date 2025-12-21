"use client"

import Image from "next/image"
import {
  HouseIcon,
  ChatCircleIcon,
  TrayIcon,
  CaretDownIcon,
  GearIcon,
  UserIcon,
  SignOutIcon,
} from "@phosphor-icons/react"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
        {/* Workspace placeholder */}
        <Button
          variant="ghost"
          className="gap-2 px-2 text-[#26251E] hover:bg-[#26251E]/5 h-8"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded bg-[#26251E]">
            <Image
              src="/portal.svg"
              alt="Workspace"
              width={12}
              height={12}
              className="invert"
            />
          </div>
          <span className="text-sm font-medium">Acme Inc</span>
          <CaretDownIcon className="ml-1 size-3 text-[#26251E]/50" />
        </Button>

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
      <DropdownMenu>
        <DropdownMenuTrigger className="h-6 gap-2 px-2 text-xs/relaxed [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none shrink-0">
          <Avatar size="sm">
            <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-[#26251E]">John Doe</span>
          <CaretDownIcon className="size-3 text-[#26251E]/50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>
            <UserIcon className="size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <GearIcon className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <SignOutIcon className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

