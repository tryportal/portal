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
import { CheckIcon, GearIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

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

  const hasChanges =
    name !== organization?.name ||
    slug !== organization?.slug ||
    description !== (organization?.description || "") ||
    imageUrl !== organization?.imageUrl

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
      if (organization && slug.trim().toLowerCase() !== organization.slug) {
        router.push(`/${slug.trim().toLowerCase()}/settings`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace")
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageSelect = async (file: File) => {
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

  if (!organization || !membership) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F7F7F4]">
        <div className="text-sm text-[#26251E]/60">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F7F7F4] p-6">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm border border-[#26251E]/5 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <WarningCircleIcon className="size-6" weight="fill" />
          </div>
          <h2 className="text-lg font-semibold text-[#26251E] mb-2">
            Access Denied
          </h2>
          <p className="text-sm text-[#26251E]/60">
            Only workspace admins can access settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#F7F7F4]">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#26251E]/10 bg-[#F7F7F4] px-4">
        <div className="flex items-center gap-2">
          <GearIcon className="size-5 text-[#26251E]" weight="fill" />
          <h1 className="text-base font-semibold text-[#26251E]">Workspace Settings</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl py-12 px-6">
          <div className="space-y-10">
            
            {/* Profile Section */}
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-[#26251E]">Workspace Profile</h2>
                <p className="text-sm text-[#26251E]/60">Manage your workspace's public identity.</p>
              </div>
              
              <div className="rounded-xl border border-[#26251E]/10 bg-white p-6 shadow-sm">
                <div className="space-y-6">
                  {/* Image Upload */}
                  <div>
                    <Label className="mb-3 block text-xs font-medium uppercase tracking-wider text-[#26251E]/50">
                      Logo
                    </Label>
                    <OrgImageUpload
                      currentImageUrl={imageUrl}
                      organizationName={name}
                      onImageSelect={handleImageSelect}
                      onImageRemove={handleImageRemove}
                    />
                  </div>

                  {/* Name Input */}
                  <div>
                    <Label htmlFor="name" className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#26251E]/50">
                      Workspace Name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="bg-[#F7F7F4] border-transparent focus-visible:bg-white transition-all"
                    />
                  </div>

                  {/* Description Input */}
                  <div>
                    <Label htmlFor="description" className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#26251E]/50">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this workspace about?"
                      className="min-h-[100px] resize-none bg-[#F7F7F4] border-transparent focus-visible:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* URL Section */}
            <section className="space-y-6">
               <div>
                <h2 className="text-lg font-medium text-[#26251E]">Workspace URL</h2>
                <p className="text-sm text-[#26251E]/60">The web address for your workspace.</p>
              </div>

              <div className="rounded-xl border border-[#26251E]/10 bg-white p-6 shadow-sm">
                <div>
                   <Label htmlFor="slug" className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#26251E]/50">
                    Workspace Slug
                  </Label>
                  <div className="flex items-center rounded-md border border-[#26251E]/10 bg-[#F7F7F4] px-3 focus-within:border-[#26251E]/20 focus-within:bg-white focus-within:ring-1 focus-within:ring-[#26251E]/20 transition-all">
                    <span className="text-sm text-[#26251E]/40 select-none">
                      {typeof window !== "undefined" ? window.location.host : "portal.app"}/
                    </span>
                    <input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                      placeholder="acme-corp"
                      className="flex-1 bg-transparent py-2 text-sm text-[#26251E] placeholder:text-[#26251E]/30 focus:outline-none"
                    />
                  </div>
                  <p className="mt-2 text-xs text-[#26251E]/50">
                    Changing this will update the URL for all members.
                  </p>
                </div>
              </div>
            </section>

            {/* Save Actions */}
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-[#26251E]/60">
                {hasChanges && "Unsaved changes"}
              </div>
              <div className="flex gap-3">
                 <Button 
                  variant="ghost" 
                  onClick={() => {
                    setName(organization.name)
                    setSlug(organization.slug)
                    setDescription(organization.description || "")
                    setImageUrl(organization.imageUrl)
                  }} 
                  disabled={!hasChanges || isSaving}
                  className="text-[#26251E]/60 hover:text-[#26251E]"
                >
                  Discard
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className={cn(
                    "gap-2 transition-all",
                    hasChanges ? "bg-[#26251E] text-white hover:bg-[#26251E]/90" : "bg-[#26251E]/5 text-[#26251E]/30"
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
          </div>
        </div>
      </div>
    </div>
  )
}

