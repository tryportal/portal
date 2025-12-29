"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoUpload } from "@/components/setup/logo-upload";
import type { Id } from "@/convex/_generated/dataModel";

interface IdentityStepProps {
  name: string;
  setName: (name: string) => void;
  slug: string;
  setSlug: (slug: string) => void;
  logoUrl?: string | null;
  onLogoUploaded: (storageId: Id<"_storage">) => void;
  onLogoRemoved: () => void;
}

export function IdentityStep({
  name,
  setName,
  slug,
  setSlug,
  logoUrl,
  onLogoUploaded,
  onLogoRemoved,
}: IdentityStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Create your workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Give your team a home with a name and URL.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="logo"
            className="text-xs font-medium text-muted-foreground"
          >
            Logo
          </Label>
          <LogoUpload
            currentLogoUrl={logoUrl}
            organizationName={name}
            onLogoUploaded={onLogoUploaded}
            onLogoRemoved={onLogoRemoved}
          />
        </div>

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
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc."
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="slug"
            className="text-xs font-medium text-muted-foreground"
          >
            Workspace URL
          </Label>
          <div className="flex">
            <span className="h-10 px-3 flex items-center text-xs text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
              tryportal.app/w/
            </span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="acme"
              className="h-10 rounded-l-none"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>
      </div>
    </div>
  );
}
