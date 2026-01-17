"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LogoUpload } from "@/components/setup/logo-upload"
import {
  CheckIcon,
  WarningCircleIcon,
  TrashIcon,
  GlobeIcon,
  LockIcon,
  ImagesIcon,
  TextTIcon,
  LinkIcon,
  ShieldIcon,
  WarningIcon,
  GearIcon,
  UserSwitchIcon,
} from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useUserDataCache } from "@/components/user-data-cache"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface WorkspaceSettingsPageProps {
  organizationId: Id<"organizations">
}

type SettingsSection = "general" | "access" | "danger"

const sections = [
  { id: "general" as const, label: "General", icon: TextTIcon },
  { id: "access" as const, label: "Access", icon: ShieldIcon },
  { id: "danger" as const, label: "Danger Zone", icon: WarningIcon, variant: "danger" as const },
]

export function WorkspaceSettingsPage({
  organizationId,
}: WorkspaceSettingsPageProps) {
  const router = useRouter()
  const { cache: userDataCache, fetchUserData } = useUserDataCache()
  const organization = useQuery(api.organizations.getOrganization, {
    id: organizationId,
  })
  const membership = useQuery(api.organizations.getUserMembership, {
    organizationId,
  })
  const userOrgs = useQuery(api.organizations.getUserOrganizations)
  const membersResult = useQuery(api.organizations.getOrganizationMembersQuery, {
    organizationId,
  })
  const updateOrganization = useMutation(api.organizations.updateOrganization)
  const deleteOrganization = useMutation(api.organizations.deleteOrganization)
  const transferOwnership = useMutation(api.organizations.transferOwnership)

  const [activeSection, setActiveSection] = React.useState<SettingsSection>("general")
  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [isPublic, setIsPublic] = React.useState(false)
  const [pendingLogoId, setPendingLogoId] = React.useState<Id<"_storage"> | null>(null)
  const [removeLogo, setRemoveLogo] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = React.useState("")
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false)
  const [selectedNewOwnerId, setSelectedNewOwnerId] = React.useState<Id<"organizationMembers"> | null>(null)
  const [isTransferring, setIsTransferring] = React.useState(false)

  // Initialize form with organization data
  React.useEffect(() => {
    if (organization) {
      setName(organization.name)
      setSlug(organization.slug)
      setDescription(organization.description || "")
      setIsPublic(organization.isPublic || false)
      setPendingLogoId(null)
      setRemoveLogo(false)
    }
  }, [organization])

  // Check if user is admin
  const isAdmin = membership?.role === "admin"

  const hasChanges =
    name !== organization?.name ||
    slug !== organization?.slug ||
    description !== (organization?.description || "") ||
    isPublic !== (organization?.isPublic || false) ||
    pendingLogoId !== null ||
    removeLogo

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Workspace name is required")
      return
    }

    if (!slug.trim()) {
      setError("Workspace URL is required")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await updateOrganization({
        id: organizationId,
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim() || undefined,
        logoId: pendingLogoId ?? undefined,
        removeLogo: removeLogo || undefined,
        isPublic: isPublic,
      })

      // If slug changed, redirect to new URL
      if (organization && slug.trim().toLowerCase() !== organization.slug) {
        router.push(`/w/${slug.trim().toLowerCase()}/settings`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUploaded = (storageId: Id<"_storage">) => {
    setPendingLogoId(storageId)
    setRemoveLogo(false)
  }

  const handleLogoRemoved = () => {
    setPendingLogoId(null)
    setRemoveLogo(true)
  }

  const handleDelete = async () => {
    if (deleteConfirmName !== organization?.name) {
      setError("Organization name does not match")
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const otherOrgs = userOrgs?.filter(
        (org) => org._id !== organizationId
      ) || []

      const targetOrg = otherOrgs.find((org) => org.role === "admin") || otherOrgs[0]

      await deleteOrganization({ organizationId })

      if (targetOrg?.slug) {
        router.push(`/w/${targetOrg.slug}`)
      } else {
        router.push("/setup")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete organization")
      setIsDeleting(false)
    }
  }

  const handleDiscard = () => {
    if (organization) {
      setName(organization.name)
      setSlug(organization.slug)
      setDescription(organization.description || "")
      setIsPublic(organization.isPublic || false)
      setPendingLogoId(null)
      setRemoveLogo(false)
      setError(null)
    }
  }

  const handleTransferOwnership = async () => {
    if (!selectedNewOwnerId) {
      setError("Please select a new owner")
      return
    }

    setIsTransferring(true)
    setError(null)

    try {
      await transferOwnership({
        organizationId,
        newOwnerMembershipId: selectedNewOwnerId,
      })

      setTransferDialogOpen(false)
      setSelectedNewOwnerId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer ownership")
    } finally {
      setIsTransferring(false)
    }
  }

  const rawAdminMembers = React.useMemo(() => {
    return membersResult?.members?.filter(
      (m) => m.role === "admin" && m.userId !== membership?.userId
    ) || []
  }, [membersResult?.members, membership?.userId])

  React.useEffect(() => {
    if (rawAdminMembers.length > 0) {
      const userIds = rawAdminMembers.map((m) => m.userId)
      fetchUserData(userIds)
    }
  }, [rawAdminMembers, fetchUserData])

  const adminMembers = React.useMemo(() => {
    return rawAdminMembers.map((member) => {
      const cached = userDataCache[member.userId]
      return {
        ...member,
        publicUserData: cached ? {
          firstName: cached.firstName,
          lastName: cached.lastName,
          imageUrl: cached.imageUrl,
        } : undefined,
      }
    })
  }, [rawAdminMembers, userDataCache])

  if (!organization || !membership) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-sm border border-border text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            <ShieldIcon className="size-6" weight="fill" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Access Denied
          </h2>
          <p className="text-sm text-muted-foreground">
            Only workspace admins can access settings. Contact an admin if you need to make changes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden sm:flex w-64 shrink-0 flex-col border-r border-border bg-background">
          {/* Sidebar Header */}
          <div className="flex h-12 items-center gap-2 border-b border-border px-4">
            <GearIcon className="size-5 text-foreground" weight="fill" />
            <h1 className="text-base font-semibold text-foreground">Settings</h1>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <nav className="p-2">
              <div className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  const isActive = activeSection === section.id
                  const isDanger = section.variant === "danger"
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? isDanger
                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            : "bg-secondary text-foreground"
                          : isDanger
                            ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4" weight={isActive ? "fill" : "regular"} />
                      {section.label}
                    </button>
                  )
                })}
              </div>
            </nav>
          </ScrollArea>

          {/* Save Actions in Sidebar */}
          {hasChanges && (
            <div className="border-t border-border p-3 space-y-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full gap-2"
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <CheckIcon className="size-4" weight="bold" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={handleDiscard}
                disabled={isSaving}
                className="w-full text-muted-foreground"
              >
                Discard
              </Button>
            </div>
          )}
        </aside>

        {/* Mobile Header & Content */}
        <div className="sm:hidden flex flex-col w-full">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
            <GearIcon className="size-4 text-foreground" weight="fill" />
            <h1 className="text-sm font-semibold text-foreground">Settings</h1>
            {hasChanges && (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  disabled={isSaving}
                  className="text-muted-foreground text-xs"
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="text-xs"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </header>

          {/* Mobile Section Tabs */}
          <div className="border-b border-border bg-background overflow-x-auto">
            <div className="flex gap-1 p-2">
              {sections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                const isDanger = section.variant === "danger"
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? isDanger
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          : "bg-secondary text-foreground"
                        : isDanger
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" weight={isActive ? "fill" : "regular"} />
                    {section.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="py-4 px-3">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* Desktop Content */}
        <main className="hidden sm:flex flex-1 flex-col overflow-hidden">
          {/* Content Header */}
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-6">
            {sections.find(s => s.id === activeSection)?.icon && (
              React.createElement(sections.find(s => s.id === activeSection)!.icon, {
                className: cn(
                  "size-5",
                  activeSection === "danger" ? "text-red-600 dark:text-red-400" : "text-foreground"
                ),
                weight: "fill"
              })
            )}
            <h2 className={cn(
              "text-base font-semibold",
              activeSection === "danger" ? "text-red-600 dark:text-red-400" : "text-foreground"
            )}>
              {sections.find(s => s.id === activeSection)?.label}
            </h2>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl py-6 px-4">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  )

  function renderContent() {
    return (
      <>
        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-start gap-2.5">
            <WarningCircleIcon className="size-4 shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="font-medium">Error</p>
              <p className="mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* General Section */}
        {activeSection === "general" && (
          <div className="space-y-4">
            {/* Logo */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <ImagesIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">
                      Workspace Logo
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                      Upload an image to represent your workspace
                    </p>
                    <LogoUpload
                      currentLogoUrl={removeLogo ? null : organization?.logoUrl}
                      organizationName={name}
                      onLogoUploaded={handleLogoUploaded}
                      onLogoRemoved={handleLogoRemoved}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Name & Description */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <TextTIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        Workspace Details
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Name and description visible to members
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label htmlFor="name" className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Name
                        </label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Acme Corp"
                          className="bg-background"
                        />
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Description
                          <span className="text-muted-foreground/60 font-normal ml-1">(optional)</span>
                        </label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="What is this workspace about?"
                          className="min-h-[80px] resize-none bg-background"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* URL */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <LinkIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">
                      Workspace URL
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                      The web address for your workspace
                    </p>

                    <div>
                      <label htmlFor="slug" className="block text-xs font-medium text-muted-foreground mb-1.5">
                        URL Slug
                      </label>
                      <div className="flex items-center rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                        <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r border-border flex items-center h-full">
                          tryportal.app/w/
                        </span>
                        <input
                          id="slug"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.toLowerCase())}
                          placeholder="acme-corp"
                          className="flex-1 bg-transparent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Changing this will update the URL for all members
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Access Section */}
        {activeSection === "access" && (
          <div className="space-y-4">
            {/* Visibility Toggle */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <ShieldIcon className="size-4 text-muted-foreground" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">Workspace Visibility</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Control who can join your workspace
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Public Option */}
                  <button
                    onClick={() => setIsPublic(true)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                      isPublic
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500/20"
                        : "border-border bg-background hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md",
                      isPublic
                        ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <GlobeIcon className="size-4" weight={isPublic ? "fill" : "regular"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className={cn(
                          "text-sm font-medium",
                          isPublic ? "text-green-700 dark:text-green-400" : "text-foreground"
                        )}>
                          Public Workspace
                        </h3>
                        {isPublic && (
                          <div className="flex size-5 items-center justify-center rounded-full bg-green-600">
                            <CheckIcon className="size-3 text-white" weight="bold" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Anyone with the workspace URL can join without an invitation
                      </p>
                    </div>
                  </button>

                  {/* Private Option */}
                  <button
                    onClick={() => setIsPublic(false)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                      !isPublic
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-background hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md",
                      !isPublic
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <LockIcon className="size-4" weight={!isPublic ? "fill" : "regular"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className={cn(
                          "text-sm font-medium",
                          !isPublic ? "text-foreground" : "text-foreground"
                        )}>
                          Private Workspace
                        </h3>
                        {!isPublic && (
                          <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                            <CheckIcon className="size-3 text-primary-foreground" weight="bold" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Only invited members can join this workspace
                      </p>
                    </div>
                  </button>
                </div>

                {/* Info box */}
                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong className="font-medium text-foreground">Note:</strong> Changing visibility affects how new members can join. Existing members will not be affected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone Section */}
        {activeSection === "danger" && (
          <div className="space-y-4">
            {/* Transfer Ownership */}
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    <UserSwitchIcon className="size-4" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">
                      Transfer Ownership
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                      Transfer this workspace to another admin. You will be demoted to a regular member.
                    </p>

                    <AlertDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300"
                            disabled={adminMembers.length === 0}
                          />
                        }
                      >
                        <UserSwitchIcon className="size-4 mr-1.5" />
                        Transfer Ownership
                      </AlertDialogTrigger>
                      <AlertDialogContent size="default" className="max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogMedia className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            <UserSwitchIcon className="size-5" weight="fill" />
                          </AlertDialogMedia>
                          <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                          <AlertDialogDescription>
                            Select a new owner for <strong className="text-foreground">{organization?.name}</strong>. You will be demoted to a regular member.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-3 py-4">
                          <label className="block text-xs font-medium text-muted-foreground">
                            Select new owner
                          </label>
                          <Select
                            value={selectedNewOwnerId ?? undefined}
                            onValueChange={(value) => {
                              setSelectedNewOwnerId(value as Id<"organizationMembers">)
                              setError(null)
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {adminMembers.map((member) => (
                                <SelectItem key={member._id} value={member._id}>
                                  {member.publicUserData?.firstName || member.publicUserData?.lastName
                                    ? `${member.publicUserData.firstName ?? ""} ${member.publicUserData.lastName ?? ""}`.trim()
                                    : "Unknown user"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            onClick={() => {
                              setSelectedNewOwnerId(null)
                              setError(null)
                            }}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleTransferOwnership}
                            disabled={!selectedNewOwnerId || isTransferring}
                            className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isTransferring ? "Transferring..." : "Transfer Ownership"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {adminMembers.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        No other admins available. Promote a member to admin first.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Delete Workspace */}
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    <TrashIcon className="size-4" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">
                      Delete Workspace
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                      Permanently delete this workspace and all of its data. This action cannot be undone.
                    </p>

                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300"
                          />
                        }
                      >
                        <TrashIcon className="size-4 mr-1.5" />
                        Delete Workspace
                      </AlertDialogTrigger>
                      <AlertDialogContent size="default" className="max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogMedia className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            <WarningCircleIcon className="size-5" weight="fill" />
                          </AlertDialogMedia>
                          <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the workspace
                            <strong className="text-foreground"> {organization?.name}</strong> and all of its data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-3 py-4">
                          <label htmlFor="delete-confirm" className="block text-xs font-medium text-muted-foreground">
                            Type <strong className="text-foreground">{organization?.name}</strong> to confirm
                          </label>
                          <Input
                            id="delete-confirm"
                            value={deleteConfirmName}
                            onChange={(e) => {
                              setDeleteConfirmName(e.target.value)
                              setError(null)
                            }}
                            placeholder={organization?.name}
                            className="bg-background"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && deleteConfirmName === organization?.name) {
                                handleDelete()
                              }
                            }}
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            onClick={() => {
                              setDeleteConfirmName("")
                              setError(null)
                            }}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteConfirmName !== organization?.name || isDeleting}
                            className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDeleting ? "Deleting..." : "Delete Workspace"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }
}
