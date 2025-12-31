"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { LogoUpload } from "@/components/setup/logo-upload"
import { CheckIcon, WarningCircleIcon, TrashIcon } from "@phosphor-icons/react"
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

interface WorkspaceSettingsSectionProps {
    organizationId: Id<"organizations">
}

export function WorkspaceSettingsSection({
    organizationId,
}: WorkspaceSettingsSectionProps) {
    const router = useRouter()
    const organization = useQuery(api.organizations.getOrganization, {
        id: organizationId,
    })
    const userOrgs = useQuery(api.organizations.getUserOrganizations)
    const updateOrganization = useMutation(api.organizations.updateOrganization)
    const deleteOrganization = useMutation(api.organizations.deleteOrganization)

    const [name, setName] = React.useState("")
    const [slug, setSlug] = React.useState("")
    const [description, setDescription] = React.useState("")
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
            setPendingLogoId(null)
            setRemoveLogo(false)
        }
    }, [organization])

    const hasChanges =
        name !== organization?.name ||
        slug !== organization?.slug ||
        description !== (organization?.description || "") ||
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
            })

            // If slug changed, redirect to new URL
            if (organization && slug.trim().toLowerCase() !== organization.slug) {
                router.push(`/w/${slug.trim().toLowerCase()}/settings/workspace`)
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
            // Get other workspaces before deletion
            const otherOrgs = userOrgs?.filter(
                (org) => org._id !== organizationId
            ) || []

            // Prioritize organization where user is admin, otherwise use first org
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

    if (!organization) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl py-6 sm:py-12 px-4 sm:px-6">
                <div className="space-y-10">

                    {/* Profile Section */}
                    <section className="space-y-6">
                        <div>
                            <h2 className="text-base sm:text-lg font-medium text-foreground">Workspace Profile</h2>
                            <p className="text-xs sm:text-sm text-muted-foreground">Manage your workspace&apos;s public identity.</p>
                        </div>

                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                            <div className="space-y-6">
                                {/* Image Upload */}
                                <div>
                                    <Label className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Logo
                                    </Label>
                                    <LogoUpload
                                        currentLogoUrl={removeLogo ? null : organization.logoUrl}
                                        organizationName={name}
                                        onLogoUploaded={handleLogoUploaded}
                                        onLogoRemoved={handleLogoRemoved}
                                    />
                                </div>

                                {/* Name Input */}
                                <div>
                                    <Label htmlFor="name" className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Workspace Name
                                    </Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Acme Corp"
                                        className="bg-background border-transparent focus-visible:bg-card transition-all"
                                    />
                                </div>

                                {/* Description Input */}
                                <div>
                                    <Label htmlFor="description" className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="What is this workspace about?"
                                        className="min-h-[100px] resize-none bg-background border-transparent focus-visible:bg-card transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* URL Section */}
                    <section className="space-y-6">
                        <div>
                            <h2 className="text-base sm:text-lg font-medium text-foreground">Workspace URL</h2>
                            <p className="text-xs sm:text-sm text-muted-foreground">The web address for your workspace.</p>
                        </div>

                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                            <div>
                                <Label htmlFor="slug" className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Workspace Slug
                                </Label>
                                <div className="flex items-center rounded-md border border-border bg-background px-3 focus-within:border-border focus-within:bg-card focus-within:ring-1 focus-within:ring-ring transition-all">
                                    <span className="text-sm text-muted-foreground select-none">
                                        {typeof window !== "undefined" ? window.location.host : "portal.app"}/
                                    </span>
                                    <input
                                        id="slug"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase())}
                                        placeholder="acme-corp"
                                        className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none"
                                    />
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Changing this will update the URL for all members.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Save Actions */}
                    <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-muted-foreground">
                            {hasChanges && "Unsaved changes"}
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setName(organization.name)
                                    setSlug(organization.slug)
                                    setDescription(organization.description || "")
                                    setPendingLogoId(null)
                                    setRemoveLogo(false)
                                }}
                                disabled={!hasChanges || isSaving}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Discard
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || !hasChanges}
                                className={cn(
                                    "gap-2 transition-all",
                                    hasChanges ? "bg-foreground text-background hover:bg-foreground/90" : "bg-muted text-foreground/30"
                                )}
                            >
                                {isSaving ? (
                                    <>Saving...</>
                                ) : (
                                    <>
                                        <CheckIcon className="size-4" weight="bold" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-center gap-2">
                            <WarningCircleIcon className="size-4" weight="fill" />
                            {error}
                        </div>
                    )}

                    {/* Danger Zone */}
                    <section className="space-y-6">
                        <div>
                            <h2 className="text-base sm:text-lg font-medium text-red-600">Danger Zone</h2>
                            <p className="text-xs sm:text-sm text-muted-foreground">Irreversible and destructive actions.</p>
                        </div>

                        <div className="rounded-xl border border-red-200 bg-card p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium text-foreground">Delete Workspace</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Once you delete a workspace, there is no going back. Please be certain.
                                    </p>
                                </div>
                                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                    <AlertDialogTrigger
                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-red-200 bg-transparent px-2 h-7 text-xs font-medium transition-all hover:bg-red-50 hover:text-red-700 text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:pointer-events-none disabled:opacity-50"
                                    >
                                        <TrashIcon className="size-4 mr-2" />
                                        Delete Workspace
                                    </AlertDialogTrigger>
                                    <AlertDialogContent size="default" className="max-w-md">
                                        <AlertDialogHeader>
                                            <AlertDialogMedia className="bg-red-50 text-red-600">
                                                <WarningCircleIcon className="size-5" weight="fill" />
                                            </AlertDialogMedia>
                                            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the workspace
                                                and all of its data. Please type <strong>{organization?.name}</strong> to confirm.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="space-y-3 py-4">
                                            <Label htmlFor="delete-confirm" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                Workspace Name
                                            </Label>
                                            <Input
                                                id="delete-confirm"
                                                value={deleteConfirmName}
                                                onChange={(e) => {
                                                    setDeleteConfirmName(e.target.value)
                                                    setError(null)
                                                }}
                                                placeholder={organization?.name}
                                                className="bg-background border-transparent focus-visible:bg-card transition-all"
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
                    </section>
                </div>
            </div>
        </div>
    )
}
