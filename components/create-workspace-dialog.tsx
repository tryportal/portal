"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { UploadSimple } from "@phosphor-icons/react";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: CreateWorkspaceDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [logoId, setLogoId] = useState<Id<"_storage"> | undefined>();
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [debouncedSlug, setDebouncedSlug] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSlug(slug), 300);
    return () => clearTimeout(timer);
  }, [slug]);

  const slugAvailability = useQuery(
    api.organizations.checkSlugAvailability,
    debouncedSlug.length > 0 ? { slug: debouncedSlug } : "skip"
  );

  const generateUploadUrl = useMutation(api.organizations.generateUploadUrl);
  const createWorkspace = useMutation(api.organizations.createWorkspace);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setName("");
      setSlug("");
      setSlugManuallyEdited(false);
      setLogoId(undefined);
      setLogoPreviewUrl(undefined);
      setError("");
    }
  }, [open]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value;
      setName(newName);
      if (!slugManuallyEdited) {
        setSlug(slugify(newName));
      }
    },
    [slugManuallyEdited]
  );

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSlugManuallyEdited(true);
      setSlug(
        e.target.value
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "")
          .slice(0, 48)
      );
    },
    []
  );

  const handleLogoUpload = useCallback(
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
        setLogoId(storageId);
        setLogoPreviewUrl(URL.createObjectURL(file));
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl]
  );

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    if (slugAvailability && !slugAvailability.available) return;

    setCreating(true);
    setError("");
    try {
      await createWorkspace({
        name: name.trim(),
        slug: slug.trim(),
        logoId,
      });
      onOpenChange(false);
      router.push(`/w/${slug.trim()}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create workspace"
      );
      setCreating(false);
    }
  };

  const isValid =
    name.trim().length > 0 &&
    slug.trim().length > 0 &&
    (slugAvailability?.available ?? true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            Set up a new workspace for your team.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Logo</FieldLabel>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex size-12 items-center justify-center border border-dashed border-border hover:border-foreground/30 overflow-hidden"
              >
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="Logo preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <UploadSimple className="size-4 text-muted-foreground" />
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
                onChange={handleLogoUpload}
              />
              <p className="text-xs text-muted-foreground">
                Click to upload
              </p>
            </div>
          </Field>

          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              placeholder="My Workspace"
              value={name}
              onChange={handleNameChange}
              autoFocus
            />
          </Field>

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
            {debouncedSlug.length > 0 && slugAvailability && (
              <FieldDescription>
                {slugAvailability.available ? (
                  <span className="text-green-600">Available</span>
                ) : (
                  <span className="text-destructive">Already taken</span>
                )}
              </FieldDescription>
            )}
          </Field>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!isValid || creating}
          >
            {creating ? "Creating..." : "Create workspace"}
          </Button>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  );
}
