"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  UploadSimple,
  Trash,
  Globe,
  Lock,
  Warning,
} from "@phosphor-icons/react";
import { Facehash } from "facehash";

interface WorkspaceOptionsProps {
  workspace: {
    _id: Id<"organizations">;
    name: string;
    slug: string;
    description?: string;
    logoUrl: string | null;
    role: string;
    createdBy: string;
    isPublic: boolean;
  };
}

export function WorkspaceOptions({ workspace }: WorkspaceOptionsProps) {
  const router = useRouter();
  const { user } = useUser();
  const isCreator = user?.id === workspace.createdBy;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-xl px-6 py-10">
        <h1 className="text-sm font-bold">Options</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage workspace settings
        </p>

        <Separator className="my-6" />

        <LogoSection workspace={workspace} />

        <Separator className="my-6" />

        <DetailsSection workspace={workspace} />

        <Separator className="my-6" />

        <SlugSection workspace={workspace} />

        <Separator className="my-6" />

        <VisibilitySection workspace={workspace} />

        {isCreator && (
          <>
            <Separator className="my-6" />
            <TransferOwnershipSection workspace={workspace} />

            <Separator className="my-6" />
            <DeleteWorkspaceSection workspace={workspace} />
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Logo Section
// ---------------------------------------------------------------------------

function LogoSection({ workspace }: { workspace: WorkspaceOptionsProps["workspace"] }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.organizations.generateUploadUrl);
  const updateWorkspace = useMutation(api.organizations.updateWorkspace);

  const currentLogo = previewUrl ?? workspace.logoUrl;

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        const url = await generateUploadUrl();
        const result = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        await updateWorkspace({
          organizationId: workspace._id,
          logoId: storageId,
        });
        setPreviewUrl(URL.createObjectURL(file));
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
        // Reset file input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [generateUploadUrl, updateWorkspace, workspace._id]
  );

  const handleRemoveLogo = useCallback(async () => {
    try {
      await updateWorkspace({
        organizationId: workspace._id,
        removeLogo: true,
      });
      setPreviewUrl(null);
    } catch (err) {
      console.error("Failed to remove logo:", err);
    }
  }, [updateWorkspace, workspace._id]);

  return (
    <div>
      <h2 className="text-sm font-bold">Workspace Logo</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload an image to represent this workspace
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative flex size-16 items-center justify-center border border-dashed border-border hover:border-foreground/30 overflow-hidden"
        >
          {currentLogo ? (
            <img
              src={currentLogo}
              alt="Workspace logo"
              className="size-full object-cover"
            />
          ) : (
            <Facehash
              name={workspace.slug}
              size={64}
              interactive={false}
              showInitial={false}
            />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <p className="text-[10px] text-muted-foreground">...</p>
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <div className="flex flex-col gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <UploadSimple size={14} />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          {(currentLogo && workspace.logoUrl) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveLogo}
            >
              <Trash size={14} />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Details Section
// ---------------------------------------------------------------------------

function DetailsSection({ workspace }: { workspace: WorkspaceOptionsProps["workspace"] }) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateWorkspace = useMutation(api.organizations.updateWorkspace);

  // Sync from server when workspace prop changes
  useEffect(() => {
    setName(workspace.name);
    setDescription(workspace.description ?? "");
  }, [workspace.name, workspace.description]);

  const hasChanges =
    name.trim() !== workspace.name ||
    (description.trim() || "") !== (workspace.description ?? "");

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateWorkspace({
        organizationId: workspace._id,
        name: name.trim(),
        description: description.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to update workspace:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-sm font-bold">Workspace Details</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Update the name and description of this workspace
      </p>

      <FieldGroup className="mt-4">
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
          />
        </Field>

        <Field>
          <FieldLabel>Description</FieldLabel>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this workspace about?"
            className="min-h-20"
          />
          <FieldDescription>
            A brief description visible to workspace members
          </FieldDescription>
        </Field>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || !name.trim() || saving}
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
        </Button>
      </FieldGroup>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Slug / URL Section
// ---------------------------------------------------------------------------

function SlugSection({ workspace }: { workspace: WorkspaceOptionsProps["workspace"] }) {
  const router = useRouter();
  const [slug, setSlug] = useState(workspace.slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [debouncedSlug, setDebouncedSlug] = useState(workspace.slug);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSlug(slug), 300);
    return () => clearTimeout(timer);
  }, [slug]);

  const slugAvailability = useQuery(
    api.organizations.checkSlugAvailability,
    debouncedSlug.length > 0 && debouncedSlug !== workspace.slug
      ? { slug: debouncedSlug }
      : "skip"
  );

  const updateWorkspaceSlug = useMutation(api.organizations.updateWorkspaceSlug);

  // Sync from server when workspace prop changes
  useEffect(() => {
    setSlug(workspace.slug);
  }, [workspace.slug]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSlug(
      e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 48)
    );
  };

  const hasChanges = slug.trim() !== workspace.slug;
  const isAvailable =
    !hasChanges || (slugAvailability?.available ?? true);

  const handleSave = async () => {
    if (!slug.trim() || !hasChanges || !isAvailable) return;
    setSaving(true);
    setError("");
    try {
      await updateWorkspaceSlug({
        organizationId: workspace._id,
        slug: slug.trim(),
      });
      router.push(`/w/${slug.trim()}/options`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update URL");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-sm font-bold">Workspace URL</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Change the URL slug for this workspace
      </p>

      <FieldGroup className="mt-4">
        <Field>
          <FieldLabel>URL</FieldLabel>
          <div className="flex items-center">
            <span className="flex h-8 items-center border border-r-0 border-input bg-muted px-2.5 text-xs text-muted-foreground">
              /w/
            </span>
            <Input
              placeholder="my-workspace"
              value={slug}
              onChange={handleSlugChange}
              className="border-l-0"
            />
          </div>
          {hasChanges && debouncedSlug.length > 0 && slugAvailability && (
            <FieldDescription>
              {slugAvailability.available ? (
                <span className="text-green-600">Available</span>
              ) : (
                <span className="text-destructive">Already taken</span>
              )}
            </FieldDescription>
          )}
          {hasChanges && (
            <p className="text-[11px] text-muted-foreground">
              Changing the URL will break any existing links to this workspace
            </p>
          )}
        </Field>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || !slug.trim() || !isAvailable || saving}
        >
          {saving ? "Updating..." : "Update URL"}
        </Button>
      </FieldGroup>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Visibility Section
// ---------------------------------------------------------------------------

function VisibilitySection({ workspace }: { workspace: WorkspaceOptionsProps["workspace"] }) {
  const updateWorkspacePublic = useMutation(api.organizations.updateWorkspacePublic);
  const [updating, setUpdating] = useState(false);

  const handleToggle = async (isPublic: boolean) => {
    if (isPublic === workspace.isPublic) return;
    setUpdating(true);
    try {
      await updateWorkspacePublic({
        organizationId: workspace._id,
        isPublic,
      });
    } catch (err) {
      console.error("Failed to update visibility:", err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <h2 className="text-sm font-bold">Workspace Visibility</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Control who can discover and join this workspace
      </p>

      <div className="mt-4 flex flex-col gap-1">
        <button
          onClick={() => handleToggle(false)}
          disabled={updating}
          className={`flex items-center gap-3 border px-3 py-2.5 text-left text-xs hover:bg-muted ${
            !workspace.isPublic
              ? "border-foreground bg-muted font-bold"
              : "border-border"
          }`}
        >
          <Lock size={16} weight={!workspace.isPublic ? "fill" : "regular"} />
          <div className="flex-1">
            <span className="block">Private</span>
            <span className="block font-normal text-muted-foreground">
              Only invited members can access this workspace
            </span>
          </div>
        </button>

        <button
          onClick={() => handleToggle(true)}
          disabled={updating}
          className={`flex items-center gap-3 border px-3 py-2.5 text-left text-xs hover:bg-muted ${
            workspace.isPublic
              ? "border-foreground bg-muted font-bold"
              : "border-border"
          }`}
        >
          <Globe size={16} weight={workspace.isPublic ? "fill" : "regular"} />
          <div className="flex-1">
            <span className="block">Public</span>
            <span className="block font-normal text-muted-foreground">
              Anyone can find and join this workspace
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Transfer Ownership Section
// ---------------------------------------------------------------------------

function TransferOwnershipSection({
  workspace,
}: {
  workspace: WorkspaceOptionsProps["workspace"];
}) {
  const router = useRouter();
  const members = useQuery(api.organizations.getWorkspaceMembers, {
    organizationId: workspace._id,
  });
  const transferOwnership = useMutation(api.organizations.transferOwnership);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Filter out the current creator from the list
  const eligibleMembers = members?.filter(
    (m) => m.userId !== workspace.createdBy
  );

  const selectedMember = members?.find((m) => m.userId === selectedUserId);
  const selectedName = selectedMember
    ? [selectedMember.firstName, selectedMember.lastName].filter(Boolean).join(" ") ||
      selectedMember.email ||
      "this user"
    : "";

  const handleTransfer = async () => {
    if (!selectedUserId) return;
    setTransferring(true);
    try {
      await transferOwnership({
        organizationId: workspace._id,
        newOwnerUserId: selectedUserId,
      });
      setTransferOpen(false);
      router.push(`/w/${workspace.slug}`);
    } catch (err) {
      console.error("Failed to transfer ownership:", err);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div>
      <h2 className="text-sm font-bold">Transfer Ownership</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Transfer this workspace to another member. You will lose creator
        privileges.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="h-8 w-full border border-border bg-background px-2 text-xs outline-none focus:border-ring"
        >
          <option value="">Select a member</option>
          {eligibleMembers?.map((member) => {
            const displayName =
              [member.firstName, member.lastName].filter(Boolean).join(" ") ||
              member.email ||
              member.userId;
            return (
              <option key={member.userId} value={member.userId}>
                {displayName} {member.role === "admin" ? "(Admin)" : "(Member)"}
              </option>
            );
          })}
        </select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setTransferOpen(true)}
          disabled={!selectedUserId}
        >
          Transfer ownership
        </Button>
      </div>

      <AlertDialog open={transferOpen} onOpenChange={setTransferOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to transfer ownership of{" "}
              <strong>{workspace.name}</strong> to{" "}
              <strong>{selectedName}</strong>? This action cannot be undone. You
              will remain as an admin but will lose creator privileges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransfer}
              disabled={transferring}
            >
              {transferring ? "Transferring..." : "Transfer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Delete Workspace Section
// ---------------------------------------------------------------------------

function DeleteWorkspaceSection({
  workspace,
}: {
  workspace: WorkspaceOptionsProps["workspace"];
}) {
  const router = useRouter();
  const deleteWorkspace = useMutation(api.organizations.deleteWorkspace);

  const [confirmName, setConfirmName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const nameMatches = confirmName === workspace.name;

  const handleDelete = async () => {
    if (!nameMatches) return;
    setDeleting(true);
    setError("");
    try {
      await deleteWorkspace({
        organizationId: workspace._id,
        confirmName,
      });
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete workspace"
      );
      setDeleting(false);
    }
  };

  return (
    <div className="border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-center gap-2">
        <Warning size={16} className="text-destructive" weight="fill" />
        <h2 className="text-sm font-bold text-destructive">Delete Workspace</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Permanently delete this workspace and all of its data. This action
        cannot be undone.
      </p>

      <Button
        variant="destructive"
        size="sm"
        className="mt-4"
        onClick={() => setDeleteOpen(true)}
      >
        Delete workspace
      </Button>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setConfirmName("");
            setError("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {workspace.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workspace, all channels,
              messages, and member data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium">
              Type <strong>{workspace.name}</strong> to confirm
            </label>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={workspace.name}
              autoFocus
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={!nameMatches || deleting}
            >
              {deleting ? "Deleting..." : "Delete workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
