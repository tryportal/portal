"use client";

import { Plus, UsersThree } from "@phosphor-icons/react";
import { StepHeading } from "@/components/setup/step-container";
import { cn } from "@/lib/utils";

interface ChoiceStepProps {
  onCreateNew: () => void;
  onJoinWorkspace?: () => void;
}

export function ChoiceStep({ onCreateNew, onJoinWorkspace }: ChoiceStepProps) {
  return (
    <div className="space-y-8">
      <StepHeading
        title="Welcome to Portal"
        description="Get started by creating a new workspace for your team or joining an existing one."
      />

      <div className="grid gap-4">
        {/* Create New Workspace Card */}
        <ChoiceCard
          icon={Plus}
          title="Create a new workspace"
          description="Start fresh with your own workspace for your team or project"
          onClick={onCreateNew}
          primary
        />

        {/* Divider */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground uppercase tracking-wide">
              or
            </span>
          </div>
        </div>

        {/* Join Public Workspace Card */}
        <ChoiceCard
          icon={UsersThree}
          title="Browse public workspaces"
          description="Join an existing public workspace and start collaborating"
          onClick={() => onJoinWorkspace?.()}
        />
      </div>
    </div>
  );
}

interface ChoiceCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  onClick,
  primary,
}: ChoiceCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full p-5 rounded-xl border bg-card text-left",
        "transition-all duration-150 hover:shadow-sm hover:border-primary/50",
        primary ? "border-primary" : "border-border"
      )}
    >
      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-150",
            primary
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
          )}
        >
          <Icon className="size-6" weight="bold" />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-semibold text-foreground text-base">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Primary indicator */}
      {primary && (
        <div className="absolute -top-2 left-4">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary text-primary-foreground">
            Recommended
          </span>
        </div>
      )}
    </button>
  );
}
