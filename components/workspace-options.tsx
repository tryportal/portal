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
  PencilSimple,
  Eye,
} from "@phosphor-icons/react";
import { WorkspaceIcon } from "@/components/workspace-icon";

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

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

type SectionId = "details" | "visibility" | "danger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTIONS: { id: SectionId; label: string; icon: React.ComponentType<any>; creatorOnly?: boolean }[] = [
  { id: "details", label: "Details", icon: PencilSimple },
  { id: "visibility", label: "Visibility", icon: Eye },
  { id: "danger", label: "Danger Zone", icon: Warning, creatorOnly: true },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function WorkspaceOptions({ workspace }: WorkspaceOptionsProps) {
  const { user } = useUser();
  const isCreator = user?.id === workspace.createdBy;
  const [activeSection, setActiveSection] = useState<SectionId>("details");

  const visibleSections = SECTIONS.filter(
    (s) => !s.creatorOnly || isCreator
  );

  useEffect(() => {
    if (!visibleSections.some((s) => s.id === activeSection)) {
      setActiveSection("details");
    }
  }, [isCreator, activeSection, visibleSections]);

  return (
    <div className="flex h-full flex-1">
      {/* Sidebar nav */}
      <nav
        className="flex flex-shrink-0 flex-col border-r border-border bg-sidebar"
        style={{ width: 224 }}
        aria-label="Settings navigation"
      >
        <div className="flex flex-col gap-px pl-2 pt-2 pb-2">
          {visibleSections.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            const isDanger = id === "danger";

            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2.5 rounded-l-[6px] border-r-[3px] px-2.5 py-1.5 text-left text-xs ${
                  isActive
                    ? isDanger
                      ? "border-destructive/30 bg-destructive/10 font-medium text-destructive"
                      : "border-foreground/30 bg-muted font-medium text-sidebar-foreground"
                    : isDanger
                      ? "border-transparent text-destructive/60 hover:bg-destructive/5 hover:text-destructive"
                      : "border-transparent text-sidebar-foreground/70 hover:bg-muted hover:text-sidebar-foreground"
                }`}
              >
                <Icon
                  size={16}
                  weight={isActive ? "fill" : "regular"}
                  aria-hidden="true"
                />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-8 py-4">
          {activeSection === "details" && <DetailsPanel workspace={workspace} />}
          {activeSection === "visibility" && <VisibilityPanel workspace={workspace} />}
          {activeSection === "danger" && isCreator && <DangerPanel workspace={workspace} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel header helper
// ---------------------------------------------------------------------------

function PanelHeader({
  icon: Icon,
  title,
  description,
  variant = "default",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  variant?: "default" | "danger";
}) {
  const isDanger = variant === "danger";
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <Icon
          size={14}
          className={isDanger ? "text-destructive" : "text-muted-foreground"}
          weight="regular"
          aria-hidden="true"
        />
        <h2
          className={`text-sm font-bold ${isDanger ? "text-destructive" : ""}`}
        >
          {title}
        </h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Details Panel (Logo + Name/Description + URL)
// ---------------------------------------------------------------------------

function DetailsPanel({
  workspace,
}: {
  workspace: WorkspaceOptionsProps["workspace"];
}) {
  return (
    <div>
      <PanelHeader
        icon={PencilSimple}
        title="Workspace Details"
        description="Manage your workspace logo, name, description, and URL"
      />

      <LogoSection workspace={workspace} />

      <Separator className="my-6" />

      <InfoSection workspace={workspace} />

      <Separator className="my-6" />

      <SlugSection workspace={workspace} />
    </div>
  );
}

// -- Logo sub-section --

function LogoSection({
  workspace,
}: {
  workspace: WorkspaceOptionsProps["workspace"];
}) {
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
      <h3 className="text-xs font-medium">Logo</h3>
      <div className="mt-2 flex items-center gap-4 border border-border bg-card px-4 py-4">
        <button
          type="button"
          aria-label="Upload workspace logo"
          onClick={() => fileInputRef.current?.click()}
          className="relative flex size-16 flex-shrink-0 items-center justify-center overflow-hidden hover:opacity-80"
        >
          <WorkspaceIcon
            logoUrl={currentLogo}
            name={workspace.name}
            slug={workspace.slug}
            size={64}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <p className="text-[10px] text-muted-foreground">{"\u2026"}</p>
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            Square images work best. Accepted formats: PNG, JPG, GIF, SVG.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <UploadSimple size={14} aria-hidden="true" />
              {uploading ? "Uploading\u2026" : "Upload"}
            </Button>
            {currentLogo && workspace.logoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
              >
                <Trash size={14} aria-hidden="true" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Name & Description sub-section --

function InfoSection({
  workspace,
}: {
  workspace: WorkspaceOptionsProps["workspace"];
}) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateWorkspace = useMutation(api.organizations.updateWorkspace);

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
    <div className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="workspace-name" className="text-xs font-medium">
          Name
        </label>
        <Input
          id="workspace-name"
          name="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workspace name\u2026"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="workspace-description" className="text-xs font-medium">
          Description
        </label>
        <Textarea
          id="workspace-description"
          name="workspace-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this workspace about\u2026"
          className="min-h-20"
          autoComplete="off"
        />
        <p className="text-[11px] text-muted-foreground">
          A brief description visible to workspace members
        </p>
      </div>

      <div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || !name.trim() || saving}
        >
          {saving ? "Saving\u2026" : saved ? "Saved" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// -- Slug / URL sub-section --

function SlugSection({
  workspace,
}: {
  workspace: WorkspaceOptionsProps["workspace"];
}) {
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

  const updateWorkspaceSlug = useMutation(
    api.organizations.updateWorkspaceSlug
  );

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
  const isAvailable = !hasChanges || (slugAvailability?.available ?? true);

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
      setError(
        err instanceof Error ? err.message : "Failed to update URL"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="workspace-slug" className="text-xs font-medium">
          URL
        </label>
        <div className="flex items-center">
          <span className="flex h-8 items-center border border-r-0 border-input bg-muted px-2.5 font-mono text-xs text-muted-foreground">
            /w/
          </span>
          <Input
            id="workspace-slug"
            name="workspace-slug"
            placeholder="my-workspace"
            value={slug}
            onChange={handleSlugChange}
            className="border-l-0 font-mono"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        {hasChanges && debouncedSlug.length > 0 && slugAvailability && (
          <p className="text-[11px]">
            {slugAvailability.available ? (
              <span className="text-green-600">Available</span>
            ) : (
              <span className="text-destructive">Already taken</span>
            )}
          </p>
        )}
        {hasChanges && (
          <p className="text-[11px] text-muted-foreground">
            Changing the URL will break any existing links to this workspace
          </p>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || !slug.trim() || !isAvailable || saving}
        >
          {saving ? "Updating\u2026" : "Update URL"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Visibility Panel
// ---------------------------------------------------------------------------

function VisibilityPanel({
  workspace,
}: {
  workspace: WorkspaceOptionsProps["workspace"];
}) {
  const updateWorkspacePublic = useMutation(
    api.organizations.updateWorkspacePublic
  );
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
      <PanelHeader
        icon={Eye}
        title="Workspace Visibility"
        description="Control who can discover and join this workspace"
      />

      <div className="flex flex-col gap-px">
        <button
          onClick={() => handleToggle(false)}
          disabled={updating}
          className={`flex items-center gap-3 border bg-card px-4 py-3 text-left text-xs hover:bg-muted/50 ${
            !workspace.isPublic
              ? "border-foreground font-bold"
              : "border-border"
          }`}
        >
          <Lock
            size={16}
            weight={!workspace.isPublic ? "fill" : "regular"}
            className="flex-shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <span className="block">Private</span>
            <span className="block font-normal text-muted-foreground">
              Only invited members can access this workspace
            </span>
          </div>
        </button>

        <button
          onClick={() => handleToggle(true)}
          disabled={updating}
          className={`flex items-center gap-3 border bg-card px-4 py-3 text-left text-xs hover:bg-muted/50 ${
            workspace.isPublic
              ? "border-foreground font-bold"
              : "border-border"
          }`}
        >
          <Globe
            size={16}
            weight={workspace.isPublic ? "fill" : "regular"}
            className="flex-shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
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
// 3. Danger Panel (Transfer Ownership + Delete Workspace)
// ---------------------------------------------------------------------------

function DangerPanel({
  workspace,
}: {
  workspace: WorkspaceOptionsProps["workspace"];
}) {
  return (
    <div>
      <PanelHeader
        icon={Warning}
        title="Danger Zone"
        description="Irreversible and destructive actions"
        variant="danger"
      />

      <TransferSection workspace={workspace} />

      <Separator className="my-6" />

      <DeleteSection workspace={workspace} />
    </div>
  );
}

// -- Transfer Ownership sub-section --

function TransferSection({
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

  const eligibleMembers = members?.filter(
    (m) => m.userId !== workspace.createdBy
  );

  const selectedMember = members?.find((m) => m.userId === selectedUserId);
  const selectedName = selectedMember
    ? [selectedMember.firstName, selectedMember.lastName]
        .filter(Boolean)
        .join(" ") ||
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
    <div className="border border-destructive/20 p-4">
      <h3 className="text-xs font-medium">Transfer Ownership</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Transfer this workspace to another member. You will lose creator
        privileges.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="transfer-member" className="text-xs font-medium">
            New owner
          </label>
          <select
            id="transfer-member"
            name="transfer-member"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="h-8 w-full border border-border bg-background px-2 text-xs outline-none focus:border-ring"
          >
            <option value="">Select a member</option>
            {eligibleMembers?.map((member) => {
              const displayName =
                [member.firstName, member.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                member.email ||
                member.userId;
              return (
                <option key={member.userId} value={member.userId}>
                  {displayName}{" "}
                  {member.role === "admin" ? "(Admin)" : "(Member)"}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTransferOpen(true)}
            disabled={!selectedUserId}
          >
            Transfer Ownership
          </Button>
        </div>
      </div>

      <AlertDialog open={transferOpen} onOpenChange={setTransferOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to transfer ownership of{" "}
              <strong>{workspace.name}</strong> to{" "}
              <strong>{selectedName}</strong>? You will remain as an admin but
              will lose creator privileges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransfer}
              disabled={transferring}
            >
              {transferring ? "Transferring\u2026" : "Transfer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// -- Delete Workspace sub-section --

function DeleteSection({
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
    <div className="border border-destructive/20 p-4">
      <h3 className="text-xs font-medium">Delete Workspace</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Permanently delete{" "}
        <strong className="text-foreground">{workspace.name}</strong> and all of
        its data including channels, messages, and members. This action cannot be
        undone.
      </p>

      <Button
        variant="destructive"
        size="sm"
        className="mt-3"
        onClick={() => setDeleteOpen(true)}
      >
        Delete Workspace
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
              This will permanently delete the workspace, all channels, messages,
              and member data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-1.5">
            <label htmlFor="confirm-delete" className="text-xs font-medium">
              Type <strong>{workspace.name}</strong> to confirm
            </label>
            <Input
              id="confirm-delete"
              name="confirm-delete"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={workspace.name}
              spellCheck={false}
              autoComplete="off"
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
              {deleting ? "Deleting\u2026" : "Delete Workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
