"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  ChartBar,
  Tray,
  ChatCircle,
  BookmarkSimple,
  Users,
  CaretDown,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface WorkspacePreviewProps {
  name: string;
  logoUrl?: string | null;
  className?: string;
}

export function WorkspacePreview({
  name,
  logoUrl,
  className,
}: WorkspacePreviewProps) {
  const displayName = name.trim() || "Your Workspace";
  const initials = displayName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "w-full max-w-[280px] rounded-xl border border-border bg-card overflow-hidden shadow-sm",
        className
      )}
    >
      {/* Window Header */}
      <div className="h-7 bg-muted/50 border-b border-border flex items-center px-3 gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400/80" />
          <div className="w-2 h-2 rounded-full bg-yellow-400/80" />
          <div className="w-2 h-2 rounded-full bg-green-400/80" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-[9px] text-muted-foreground font-medium">
            Preview
          </span>
        </div>
      </div>

      {/* App Content */}
      <div className="flex h-[220px]">
        {/* Sidebar */}
        <div className="w-full bg-background flex flex-col">
          {/* Workspace Header */}
          <div className="h-10 border-b border-border px-3 flex items-center gap-2.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={logoUrl || "initials"}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-6 h-6 rounded-md bg-primary flex items-center justify-center overflow-hidden shrink-0"
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : initials ? (
                  <span className="text-[10px] font-semibold text-primary-foreground">
                    {initials}
                  </span>
                ) : (
                  <ImageIcon
                    className="size-3 text-primary-foreground/60"
                    weight="duotone"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.span
                key={displayName}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-semibold text-foreground truncate"
              >
                {displayName}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Sidebar Navigation */}
          <div className="flex-1 p-2 space-y-0.5 overflow-hidden">
            <SidebarItem icon={ChartBar} label="Overview" />
            <SidebarItem icon={Tray} label="Inbox" active badge={3} />
            <SidebarItem icon={ChatCircle} label="Messages" />
            <SidebarItem icon={BookmarkSimple} label="Saved" />
            <SidebarItem icon={Users} label="People" />

            {/* Channels Section */}
            <div className="pt-3">
              <div className="flex items-center gap-1 px-2 py-1 text-[9px] text-muted-foreground uppercase tracking-wider font-medium">
                <CaretDown className="size-2.5" />
                <span>Channels</span>
              </div>
              <div className="mt-0.5 space-y-0.5">
                <ChannelItem name="general" active />
                <ChannelItem name="random" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Label */}
      <div className="h-8 bg-muted/30 border-t border-border flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground">
          Your workspace preview
        </span>
      </div>
    </motion.div>
  );
}

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  badge?: number;
}

function SidebarItem({ icon: Icon, label, active, badge }: SidebarItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] cursor-default transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground"
      )}
    >
      <Icon className="size-3.5" weight={active ? "fill" : "regular"} />
      <span className={active ? "font-medium" : ""}>{label}</span>
      {badge && (
        <span className="ml-auto text-[8px] bg-foreground text-background rounded-full px-1.5 py-0.5 font-medium">
          {badge}
        </span>
      )}
    </div>
  );
}

interface ChannelItemProps {
  name: string;
  active?: boolean;
}

function ChannelItem({ name, active }: ChannelItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] cursor-default transition-colors",
        active
          ? "bg-secondary text-foreground font-medium"
          : "text-muted-foreground"
      )}
    >
      <Hash className="size-3" />
      <span>{name}</span>
    </div>
  );
}
