"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AboutStepProps {
  description: string;
  setDescription: (description: string) => void;
}

export function AboutStep({ description, setDescription }: AboutStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Describe your workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Help your team understand what this workspace is for.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">
          Description <span className="text-muted-foreground/60">(optional)</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="We're building the future of..."
          className="min-h-[160px] resize-none"
        />
        <p className="text-[10px] text-muted-foreground">
          Visible to all workspace members
        </p>
      </div>
    </div>
  );
}
