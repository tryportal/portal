"use client";

import { Button } from "@/components/ui/button";
import { Plus, UsersThree } from "@phosphor-icons/react";

interface ChoiceStepProps {
  onChoice: (choice: "create" | "join") => void;
}

export function ChoiceStep({ onChoice }: ChoiceStepProps) {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-xl font-medium tracking-tight">
          Welcome to Portal
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Create a new workspace or join an existing one to get started.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-20 w-full flex-col gap-1.5"
          onClick={() => onChoice("create")}
        >
          <Plus className="size-5" />
          <span>Create a workspace</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-20 w-full flex-col gap-1.5"
          onClick={() => onChoice("join")}
        >
          <UsersThree className="size-5" />
          <span>Join a workspace</span>
        </Button>
      </div>
    </div>
  );
}
