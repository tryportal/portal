"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { OrgImageUpload } from "@/components/setup/org-image-upload"
import { CheckIcon } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"

interface WorkspaceSettingsPageProps {
  organizationId: Id<"organizations">
}

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
  const updateOrganization = useMutation(api.organizations.updateOrganization)

  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [imageUrl, setImageUrl] = React.useState<string | undefined>(undefined)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Initialize form with organization data
  React.useEffect(() => {
    if (organization) {
      setName(organization.name)
      setSlug(organization.slug)
      setDescription(organization.description || "")
      setImageUrl(organization.imageUrl)
    }
  }, [organization])

  // Check if user is admin
  const isAdmin = membership?.role === "admin"

  if (!organization || !membership) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-[#26251E]/60">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-sm border border-[#26251E]/10">
          <h2 className="text-lg font-semibold text-[#26251E] mb-2">
            Workspace Settings
          </h2>
          <p className="text-sm text-[#26251E]/60">
            Only workspace admins can access settings.
          </p>
        </div>
      </div>
    )
  }

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
        imageUrl,
      })

      // If slug changed, redirect to new URL
      if (slug.trim().toLowerCase() !== organization.slug) {
        router.push(`/${slug.trim().toLowerCase()}/settings`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace")
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageSelect = async (file: File) => {
    // For now, we'll use a data URL. In production, you'd upload to Convex file storage
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImageUrl(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleImageRemove = async () => {
    setImageUrl(undefined)
  }

  const hasChanges =
    name !== organization.name ||
    slug !== organization.slug ||
    description !== (organization.description || "") ||
    imageUrl !== organization.imageUrl

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#26251E]/10 px-6 py-4">
        <h2 className="text-lg font-semibold text-[#26251E]">
          Workspace Settings
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Profile Picture */}
          <div>
            <Label htmlFor="image">Workspace Image</Label>
            <div className="mt-2">
              <OrgImageUpload
                currentImageUrl={imageUrl}
                organizationName={name}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workspace"
              className="mt-2"
            />
          </div>

          {/* Slug */}
          <div>
            <Label htmlFor="slug">Workspace URL</Label>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-[#26251E]/50">
                {typeof window !== "undefined" ? window.location.origin : ""}/
              </span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="my-workspace"
                className="flex-1"
              />
            </div>
            <p className="mt-1 text-xs text-[#26251E]/50">
              This is your workspace's unique URL identifier
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's your workspace about?"
              className="mt-2 min-h-[100px] resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-[#26251E]/10 px-6 py-4">
        <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="gap-2"
        >
          {isSaving ? (
            <>Saving...</>
          ) : (
            <>
              <CheckIcon className="size-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

