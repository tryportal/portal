"use client";

import { motion } from "framer-motion";
import {
  Hash,
  At,
  ChatCircle,
  Tray,
  BookmarkSimple,
  Users,
  CaretDown,
  Bell,
  PaperPlaneTilt,
  Lightning,
  ChartBar,
  Check,
} from "@phosphor-icons/react";

// Snapshot 1: Real-time Messaging
function MessagingSnapshot() {
  return (
    <div className="w-full h-full rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="h-9 border-b border-border px-3 flex items-center gap-2">
        <Hash className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">product</span>
        <span className="text-[10px] text-muted-foreground ml-1">4 members</span>
      </div>

      {/* Messages */}
      <div className="p-3 space-y-3">
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center shrink-0">
            <span className="text-[8px] font-medium text-white">AK</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-semibold text-foreground">Alex</span>
              <span className="text-[9px] text-muted-foreground">10:32 AM</span>
            </div>
            <p className="text-[11px] text-foreground/80 leading-relaxed">
              shipped the new onboarding flow
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
            <span className="text-[8px] font-medium text-white">JM</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-semibold text-foreground">Jordan</span>
              <span className="text-[9px] text-muted-foreground">10:33 AM</span>
            </div>
            <p className="text-[11px] text-foreground/80 leading-relaxed">
              nice! testing it now
            </p>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.3 }}
          className="flex gap-2"
        >
          <div className="w-6 h-6 rounded-md bg-violet-500 flex items-center justify-center shrink-0">
            <span className="text-[8px] font-medium text-white">SK</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-semibold text-foreground">Sam</span>
              <span className="text-[9px] text-muted-foreground">just now</span>
              <Lightning className="size-2.5 text-yellow-500" weight="fill" />
            </div>
            <p className="text-[11px] text-foreground/80 leading-relaxed">
              looks great, approved
            </p>
          </div>
        </motion.div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5">
          <span className="text-[10px] text-muted-foreground flex-1">Message #product</span>
          <PaperPlaneTilt className="size-3 text-muted-foreground" weight="fill" />
        </div>
      </div>
    </div>
  );
}

// Snapshot 2: Smart Organization
function OrganizationSnapshot() {
  return (
    <div className="w-full h-full rounded-lg border border-border bg-card overflow-hidden">
      {/* Sidebar mock */}
      <div className="h-full flex flex-col">
        {/* Workspace header */}
        <div className="h-9 border-b border-border px-3 flex items-center gap-2.5">
          <div className="w-4 h-4 rounded bg-foreground flex items-center justify-center">
            <span className="text-[7px] font-bold text-background">A</span>
          </div>
          <span className="text-xs font-semibold text-foreground">Acme</span>
          <CaretDown className="size-3 text-muted-foreground ml-auto" />
        </div>

        {/* Navigation */}
        <div className="p-2 space-y-0.5">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-muted-foreground">
            <ChartBar className="size-3.5" />
            <span>Overview</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] bg-secondary text-foreground font-medium">
            <Tray className="size-3.5" weight="fill" />
            <span>Inbox</span>
            <span className="ml-auto text-[9px] bg-foreground text-background rounded-full px-1.5 font-semibold">5</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-muted-foreground">
            <ChatCircle className="size-3.5" />
            <span>Messages</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-muted-foreground">
            <BookmarkSimple className="size-3.5" />
            <span>Saved</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-muted-foreground">
            <Users className="size-3.5" />
            <span>People</span>
          </div>

          {/* Channels */}
          <div className="pt-2">
            <div className="flex items-center gap-1 px-2 py-1 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
              <CaretDown className="size-2.5" />
              <span>Channels</span>
            </div>
            <div className="mt-0.5 space-y-0.5">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-muted-foreground">
                <Hash className="size-3" />
                <span>general</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-foreground font-medium">
                <Hash className="size-3" />
                <span>engineering</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-foreground" />
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-muted-foreground">
                <Hash className="size-3" />
                <span>design</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Snapshot 3: Stay Connected (Inbox/Notifications)
function InboxSnapshot() {
  return (
    <div className="w-full h-full rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="h-9 border-b border-border px-3 flex items-center gap-2">
        <Tray className="size-3.5 text-foreground" weight="fill" />
        <span className="text-xs font-semibold text-foreground">Inbox</span>
        <span className="text-[9px] bg-foreground text-background rounded-full px-1.5 py-0.5 font-semibold ml-1">3</span>
      </div>

      {/* Inbox items */}
      <div className="p-2 space-y-1.5">
        <motion.div 
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="flex items-start gap-2 px-2 py-2 rounded-md bg-muted/50 border border-border/50"
        >
          <At className="size-3.5 text-blue-500 shrink-0 mt-0.5" weight="bold" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-foreground">Alex mentioned you</span>
              <span className="text-[9px] text-muted-foreground">2m</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              @you can you review this PR?
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-muted/30"
        >
          <ChatCircle className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-foreground">New DM from Jordan</span>
              <span className="text-[9px] text-muted-foreground">15m</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              sounds good, let&apos;s sync later
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-muted/30"
        >
          <Bell className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-foreground">Thread reply in #product</span>
              <span className="text-[9px] text-muted-foreground">1h</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              Sam: done, merged it
            </p>
          </div>
        </motion.div>
      </div>

      {/* Mark all read */}
      <div className="px-3 pb-3">
        <button className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <Check className="size-3" />
          <span>Mark all as read</span>
        </button>
      </div>
    </div>
  );
}

const snapshots = [
  {
    title: "Real-time messaging",
    description: "Messages sync instantly. Your team sees updates the moment they happen.",
    Component: MessagingSnapshot,
  },
  {
    title: "Smart organization",
    description: "Channels, DMs, saved items — everything organized and easy to find.",
    Component: OrganizationSnapshot,
  },
  {
    title: "Stay in the loop",
    description: "One inbox for mentions, replies, and DMs. Never miss what matters.",
    Component: InboxSnapshot,
  },
];

export function Features() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Everything you need,{" "}
            <span className="text-muted-foreground">nothing you don&apos;t</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Built for teams who want to get work done without the clutter.
          </p>
        </motion.div>

        {/* Snapshots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {snapshots.map((snapshot, index) => (
            <motion.div
              key={snapshot.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col"
            >
              {/* Snapshot Preview */}
              <div className="h-64 sm:h-72 mb-5">
                <snapshot.Component />
              </div>

              {/* Text */}
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                {snapshot.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {snapshot.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
