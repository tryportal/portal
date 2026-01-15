"use client";

import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LogoUpload } from "@/components/setup/logo-upload";
import { WorkspacePreview } from "@/components/setup/workspace-preview";
import { StepHeading, StepField } from "@/components/setup/step-container";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface IdentityStepProps {
  name: string;
  setName: (name: string) => void;
  slug: string;
  setSlug: (slug: string) => void;
  description: string;
  setDescription: (description: string) => void;
  logoUrl?: string | null;
  onLogoUploaded: (storageId: Id<"_storage">) => void;
  onLogoRemoved: () => void;
}

export function IdentityStep({
  name,
  setName,
  slug,
  setSlug,
  description,
  setDescription,
  logoUrl,
  onLogoUploaded,
  onLogoRemoved,
}: IdentityStepProps) {
  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name if slug is empty or matches previous auto-generated value
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 30);
  };

  return (
    <div className="space-y-8">
      <StepHeading
        title="Create your workspace"
        description="Give your workspace a name, URL, and optional description to get started."
      />

      {/* Main content - form and preview side by side on larger screens */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Form Section */}
        <div className="flex-1 space-y-6">
          {/* Logo Upload */}
          <StepField delay={0.1}>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Logo
              </Label>
              <LogoUpload
                currentLogoUrl={logoUrl}
                organizationName={name}
                onLogoUploaded={onLogoUploaded}
                onLogoRemoved={onLogoRemoved}
              />
            </div>
          </StepField>

          {/* Workspace Name */}
          <StepField delay={0.15}>
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-xs font-medium text-muted-foreground"
              >
                Workspace name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme Inc."
                className="h-11"
                autoFocus
              />
            </div>
          </StepField>

          {/* Workspace URL */}
          <StepField delay={0.2}>
            <div className="space-y-2">
              <Label
                htmlFor="slug"
                className="text-xs font-medium text-muted-foreground"
              >
                Workspace URL
              </Label>
              <div className="flex">
                <span className="h-11 px-3 flex items-center text-xs text-muted-foreground bg-muted border border-r-0 border-input rounded-l-lg">
                  tryportal.app/w/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  placeholder="acme"
                  className="h-11 rounded-l-none"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>
          </StepField>

          {/* Description (Optional) */}
          <StepField delay={0.25}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="description"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Description
                </Label>
                <span className="text-[10px] text-muted-foreground/60 px-1.5 py-0.5 rounded bg-muted">
                  Optional
                </span>
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this workspace about?"
                className="min-h-[80px] resize-none"
              />
            </div>
          </StepField>
        </div>

        {/* Preview Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex flex-col items-center justify-start pt-2"
        >
          <WorkspacePreview name={name} logoUrl={logoUrl} />
        </motion.div>
      </div>

      {/* Mobile Preview - shown below form on smaller screens */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "flex lg:hidden justify-center pt-4",
          !name && !logoUrl && "hidden"
        )}
      >
        <WorkspacePreview name={name} logoUrl={logoUrl} />
      </motion.div>
    </div>
  );
}
