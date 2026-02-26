"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle } from "@phosphor-icons/react";

interface CreateDoneStepProps {
  workspaceName: string;
  onFinish: () => void;
}

export function CreateDoneStep({ workspaceName, onFinish }: CreateDoneStepProps) {
  return (
    <div className="w-full max-w-sm text-center">
      <div className="mb-8 flex flex-col items-center">
        <CheckCircle className="size-12 text-foreground mb-4" weight="light" />
        <h1 className="text-xl font-medium tracking-tight">
          Workspace created
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {workspaceName} is ready to go.
        </p>
      </div>
      <Button size="lg" className="w-full" onClick={onFinish}>
        Go to workspace
      </Button>
    </div>
  );
}
