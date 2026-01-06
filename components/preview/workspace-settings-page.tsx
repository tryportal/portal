"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
} from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
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

interface WorkspaceSettingsPageProps {
  organizationId: Id<"organizations">
}

type SettingsSection = "general" | "access" | "danger"

export function WorkspaceSettingsPage({
  organizationId,
}: WorkspaceSettingsPageProps) {
  const router = useRouter()
  const organization = useQuery(api.organizations.getOrganization, {
    id: organizationId,
  })
  const membership = useQuery(api.organizations.getUserMembership, {
    organizationId,
  })
  const userOrgs = useQuery(api.organizations.getUserOrganizations)
  const updateOrganization = useMutation(api.organizations.updateOrganization)
  const deleteOrganization = useMutation(api.organizations.deleteOrganization)

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

  const sections = [
    { id: "general" as const, label: "General", icon: TextTIcon },
    { id: "access" as const, label: "Access", icon: ShieldIcon },
    { id: "danger" as const, label: "Danger Zone", icon: WarningIcon, variant: "danger" as const },
  ]

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="hidden sm:flex w-56 shrink-0 flex-col border-r border-border bg-background">
          <div className="p-4">
            <h1 className="text-lg font-semibold text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Workspace configuration
            </p>
          </div>
          <nav className="flex-1 px-2 pb-4">
            <div className="space-y-0.5">
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

        {/* Mobile section selector */}
        <div className="sm:hidden border-b border-border bg-background">
          <div className="flex gap-1 p-2 overflow-x-auto">
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
                        : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-4" weight={isActive ? "fill" : "regular"} />
                  {section.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl py-6 sm:py-10 px-4 sm:px-8">
            {/* Error Message */}
            {error && (
              <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-start gap-3">
                <WarningCircleIcon className="size-5 shrink-0 mt-0.5" weight="fill" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="mt-0.5 opacity-90">{error}</p>
                </div>
              </div>
            )}

            {/* General Section */}
            {activeSection === "general" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">General</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Basic information about your workspace
                  </p>
                </div>

                {/* Logo */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <ImagesIcon className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground">
                          Workspace Logo
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                          Upload an image to represent your workspace
                        </p>
                        <LogoUpload
                          currentLogoUrl={removeLogo ? null : organization.logoUrl}
                          organizationName={name}
                          onLogoUploaded={handleLogoUploaded}
                          onLogoRemoved={handleLogoRemoved}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Name & Description */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-5 sm:p-6 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <TextTIcon className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-5">
                        <div>
                          <h3 className="text-sm font-medium text-foreground">
                            Workspace Details
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Name and description visible to members
                          </p>
                        </div>

                        <div className="space-y-4">
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
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <LinkIcon className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground">
                          Workspace URL
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
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

                {/* Mobile Save Actions */}
                {hasChanges && (
                  <div className="sm:hidden flex gap-3 pt-4">
                    <Button
                      variant="ghost"
                      onClick={handleDiscard}
                      disabled={isSaving}
                      className="flex-1 text-muted-foreground"
                    >
                      Discard
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 gap-2"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Access Section */}
            {activeSection === "access" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Access</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Control who can join your workspace
                  </p>
                </div>

                {/* Visibility Toggle */}
                <div className="space-y-3">
                  {/* Public Option */}
                  <button
                    onClick={() => setIsPublic(true)}
                    className={cn(
                      "w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left",
                      isPublic
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500/20"
                        : "border-border bg-card hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      isPublic
                        ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <GlobeIcon className="size-5" weight={isPublic ? "fill" : "regular"} />
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
                      "w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left",
                      !isPublic
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      !isPublic
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <LockIcon className="size-5" weight={!isPublic ? "fill" : "regular"} />
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
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    <strong className="font-medium text-foreground">Note:</strong> Changing visibility affects how new members can join. Existing members will not be affected.
                  </p>
                </div>

                {/* Mobile Save Actions */}
                {hasChanges && (
                  <div className="sm:hidden flex gap-3 pt-4">
                    <Button
                      variant="ghost"
                      onClick={handleDiscard}
                      disabled={isSaving}
                      className="flex-1 text-muted-foreground"
                    >
                      Discard
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 gap-2"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Danger Zone Section */}
            {activeSection === "danger" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Irreversible and destructive actions
                  </p>
                </div>

                {/* Delete Workspace */}
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 overflow-hidden">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        <TrashIcon className="size-5" weight="fill" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground">
                          Delete Workspace
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
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
          </div>
        </main>
      </div>
    </div>
  )
}
