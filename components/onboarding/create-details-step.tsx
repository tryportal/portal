"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { ArrowLeft, UploadSimple } from "@phosphor-icons/react";
import { Facehash } from "facehash";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export interface WorkspaceData {
  name: string;
  slug: string;
  description: string;
  logoId?: Id<"_storage">;
  logoPreviewUrl?: string;
  organizationId?: Id<"organizations">;
}

interface CreateDetailsStepProps {
  onNext: (data: WorkspaceData) => void;
  onBack: () => void;
}

export function CreateDetailsStep({ onNext, onBack }: CreateDetailsStepProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [logoId, setLogoId] = useState<Id<"_storage"> | undefined>();
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounced slug for availability check
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
      const orgId = await createWorkspace({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        logoId,
      });
      onNext({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        logoId,
        logoPreviewUrl,
        organizationId: orgId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
      setCreating(false);
    }
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const isValid =
    name.trim().length > 0 &&
    slug.trim().length > 0 &&
    (slugAvailability?.available ?? true);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-xl font-medium tracking-tight">
          Create your workspace
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Set up your workspace details.
        </p>
      </div>

      <FieldGroup>
        {/* Logo upload */}
        <Field>
          <FieldLabel>Logo</FieldLabel>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex size-16 items-center justify-center border border-dashed border-border hover:border-foreground/30 transition-colors overflow-hidden"
            >
              {logoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreviewUrl}
                  alt="Logo preview"
                  className="size-full object-cover"
                />
              ) : slug ? (
                <Facehash
                  name={slug}
                  size={64}
                  interactive={false}
                  showInitial={false}
                />
              ) : (
                <UploadSimple className="size-5 text-muted-foreground" />
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
              Click to upload a logo
            </p>
          </div>
        </Field>

        {/* Name */}
        <Field>
          <FieldLabel>Workspace name</FieldLabel>
          <Input
            placeholder="My Workspace"
            value={name}
            onChange={handleNameChange}
          />
        </Field>

        {/* Slug */}
        <Field>
          <FieldLabel>Workspace URL</FieldLabel>
          <div className="flex items-center">
            <span className="flex h-8 items-center border border-r-0 border-input bg-muted px-2.5 text-xs text-muted-foreground">
              {appUrl}/w/
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

        {/* Description */}
        <Field>
          <FieldLabel>Description (optional)</FieldLabel>
          <Textarea
            placeholder="What is this workspace about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </Field>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={!isValid || creating}
        >
          {creating ? "Creating..." : "Continue"}
        </Button>
      </FieldGroup>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back
        </button>
      </div>
    </div>
  );
}
