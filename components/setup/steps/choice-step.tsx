"use client";

import { motion } from "framer-motion";
import { Plus, UsersThree, ArrowRight } from "@phosphor-icons/react";
import { StepHeading } from "@/components/setup/step-container";

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

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="grid gap-4"
      >
        {/* Create New Workspace Card */}
        <ChoiceCard
          icon={Plus}
          title="Create a new workspace"
          description="Start fresh with your own workspace for your team or project"
          onClick={onCreateNew}
          primary
          delay={0.2}
        />

        {/* Divider */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="bg-background px-3 text-xs text-muted-foreground uppercase tracking-wide"
            >
              or
            </motion.span>
          </div>
        </div>

        {/* Join Public Workspace Card */}
        <ChoiceCard
          icon={UsersThree}
          title="Browse public workspaces"
          description="Join an existing public workspace and start collaborating"
          onClick={() => onJoinWorkspace?.()}
          delay={0.25}
        />
      </motion.div>
    </div>
  );
}

interface ChoiceCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
  delay?: number;
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  onClick,
  primary,
  delay = 0,
}: ChoiceCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="group relative w-full p-5 rounded-xl border bg-card text-left transition-all duration-200 hover:shadow-md"
      style={{
        borderColor: primary ? "var(--primary)" : "var(--border)",
      }}
    >
      {/* Background highlight on hover */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-primary/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
            primary
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
          }`}
        >
          <Icon className="size-6" weight="bold" />
        </motion.div>

        {/* Text content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-semibold text-foreground text-base">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Arrow indicator */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 0, x: -8 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <ArrowRight className="size-4 text-primary" weight="bold" />
          </div>
        </motion.div>
      </div>

      {/* Primary indicator */}
      {primary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.2 }}
          className="absolute -top-2 left-4"
        >
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary text-primary-foreground">
            Recommended
          </span>
        </motion.div>
      )}
    </motion.button>
  );
}
