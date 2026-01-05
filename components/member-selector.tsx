"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useUserDataCache } from "@/components/user-data-cache"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MagnifyingGlassIcon, CheckIcon, UserIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface MemberSelectorProps {
  organizationId: Id<"organizations">
  selectedMemberIds: string[]
  onSelectionChange: (memberIds: string[]) => void
  label?: string
  excludeUserIds?: string[] // User IDs to exclude from selection
}

export function MemberSelector({
  organizationId,
  selectedMemberIds,
  onSelectionChange,
  label = "Select Members",
  excludeUserIds = [],
}: MemberSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const { cache: userDataCache, fetchUserData } = useUserDataCache()

  // Get members
  const membersResult = useQuery(
    api.organizations.getOrganizationMembersQuery,
    { organizationId }
  )

  const rawMembers = membersResult?.members ?? []
  const isLoading = membersResult === undefined

  // Fetch user data for all members
  React.useEffect(() => {
    if (rawMembers.length > 0) {
      const userIds = rawMembers.map((m) => m.userId)
      fetchUserData(userIds)
    }
  }, [rawMembers, fetchUserData])

  // Transform members with cached user data
  const members = React.useMemo(() => {
    return rawMembers
      .filter((m) => !excludeUserIds.includes(m.userId))
      .map((member) => {
        const cached = userDataCache[member.userId]
        return {
          userId: member.userId,
          role: member.role,
          firstName: cached?.firstName ?? null,
          lastName: cached?.lastName ?? null,
          imageUrl: cached?.imageUrl ?? null,
        }
      })
  }, [rawMembers, userDataCache, excludeUserIds])

  const getDisplayName = (member: { firstName: string | null; lastName: string | null }) => {
    if (member.firstName || member.lastName) {
      return `${member.firstName || ""} ${member.lastName || ""}`.trim()
    }
    return "Unknown User"
  }

  const getInitials = (member: { firstName: string | null; lastName: string | null }) => {
    const name = getDisplayName(member)
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return members
    const query = searchQuery.toLowerCase()
    return members.filter((member) => {
      const name = getDisplayName(member).toLowerCase()
      return name.includes(query)
    })
  }, [members, searchQuery])

  const toggleMember = (userId: string) => {
    if (selectedMemberIds.includes(userId)) {
      onSelectionChange(selectedMemberIds.filter((id) => id !== userId))
    } else {
      onSelectionChange([...selectedMemberIds, userId])
    }
  }

  const selectedCount = selectedMemberIds.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
        {selectedCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {selectedCount} selected
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-sm bg-background"
        />
      </div>

      {/* Members List */}
      <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border bg-background">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-8 text-center">
            <UserIcon className="mx-auto size-6 text-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "No members found" : "No members available"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredMembers.map((member) => {
              const isSelected = selectedMemberIds.includes(member.userId)
              return (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => toggleMember(member.userId)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    "hover:bg-muted/50",
                    isSelected && "bg-muted"
                  )}
                >
                  <Avatar className="size-8 shrink-0">
                    {member.imageUrl ? (
                      <AvatarImage src={member.imageUrl} alt={getDisplayName(member)} />
                    ) : null}
                    <AvatarFallback className="text-xs">{getInitials(member)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {getDisplayName(member)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {member.role}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                      isSelected
                        ? "border-primary bg-foreground text-background"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {isSelected && <CheckIcon className="size-3" weight="bold" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
