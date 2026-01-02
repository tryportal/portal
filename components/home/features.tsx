"use client";

import { motion } from "framer-motion";
import {
  Lightning,
  ShieldCheck,
  Hash,
  ChatCircle,
  Bell,
  Folder,
  At,
  CaretDown,
  Plus,
  Smiley,
  PaperPlaneTilt,
  Tray,
  BookmarkSimple,
  Check,
  X,
  Lock,
} from "@phosphor-icons/react";

// Mini mock components for each feature
function MockInstantMessaging() {
  return (
    <div className="w-full h-24 rounded border border-border bg-card overflow-hidden">
      <div className="p-2 space-y-1.5">
        <div className="flex gap-1.5 items-start">
          <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center shrink-0">
            <span className="text-[7px] font-medium text-white">SC</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-semibold text-foreground">
                Sarah
              </span>
              <span className="text-[8px] text-muted-foreground">just now</span>
            </div>
            <p className="text-[9px] text-foreground/80">Deploying now!</p>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="flex gap-1.5 items-start"
        >
          <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center shrink-0">
            <span className="text-[7px] font-medium text-white">AR</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-semibold text-foreground">
                Alex
              </span>
              <span className="text-[8px] text-muted-foreground">now</span>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center"
              >
                <Lightning className="size-2 text-yellow-500" weight="fill" />
              </motion.div>
            </div>
            <p className="text-[9px] text-foreground/80">Nice work!</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MockPrivacy() {
  return (
    <div className="w-full h-24 rounded border border-border bg-card overflow-hidden">
      <div className="h-full flex flex-col items-center justify-center gap-2 p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Lock className="size-4 text-foreground" weight="fill" />
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-16 bg-muted rounded" />
            <div className="h-1.5 w-12 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-medium">
          <ShieldCheck className="size-3" weight="fill" />
          <span>Secured</span>
        </div>
      </div>
    </div>
  );
}

function MockChannels() {
  return (
    <div className="w-full h-24 rounded border border-border bg-card overflow-hidden">
      <div className="p-2 space-y-1">
        <div className="flex items-center gap-1 px-1.5 py-0.5 text-[8px] text-muted-foreground uppercase tracking-wider">
          <CaretDown className="size-2" />
          <span>Channels</span>
        </div>
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-secondary text-foreground text-[9px]">
          <Hash className="size-2.5" />
          <span>general</span>
        </div>
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded text-muted-foreground text-[9px]">
          <Hash className="size-2.5" />
          <span>engineering</span>
          <div className="ml-auto w-1 h-1 rounded-full bg-foreground" />
        </div>
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded text-muted-foreground text-[9px]">
          <Hash className="size-2.5" />
          <span>design</span>
        </div>
      </div>
    </div>
  );
}

function MockDirectMessages() {
  return (
    <div className="w-full h-24 rounded border border-border bg-card overflow-hidden">
      <div className="p-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/30">
          <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
            <span className="text-[8px] font-medium text-white">JL</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-foreground">
                Jordan Lee
              </span>
              <span className="text-[8px] text-muted-foreground">2m</span>
            </div>
            <p className="text-[9px] text-muted-foreground truncate">
              Sounds good, let&apos;s sync up!
            </p>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-1 px-2">
          <div className="flex -space-x-1">
            <div className="w-4 h-4 rounded-full bg-blue-500 border border-card" />
            <div className="w-4 h-4 rounded-full bg-emerald-500 border border-card" />
          </div>
          <span className="text-[8px] text-muted-foreground">
            Jordan is typing...
          </span>
        </div>
      </div>
    </div>
  );
}

function MockInbox() {
  return (
    <div className="w-full h-24 rounded border border-border bg-card overflow-hidden">
      <div className="h-6 border-b border-border px-2 flex items-center gap-1.5">
        <Tray className="size-3 text-foreground" weight="fill" />
        <span className="text-[9px] font-medium text-foreground">Inbox</span>
        <span className="ml-auto text-[8px] bg-foreground text-background rounded-full px-1">
          3
        </span>
      </div>
      <div className="p-1.5 space-y-1">
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-muted/50">
          <At className="size-3 text-blue-500 shrink-0" weight="bold" />
          <span className="text-[9px] font-medium text-foreground">
            @mentioned in #general
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded">
          <ChatCircle className="size-3 text-muted-foreground shrink-0" />
          <span className="text-[9px] text-muted-foreground">
            New message from Alex
          </span>
        </div>
      </div>
    </div>
  );
}

function MockSaved() {
  return (
    <div className="w-full h-24 rounded border border-border bg-card overflow-hidden">
      <div className="h-6 border-b border-border px-2 flex items-center gap-1.5">
        <BookmarkSimple className="size-3 text-foreground" weight="fill" />
        <span className="text-[9px] font-medium text-foreground">Saved</span>
      </div>
      <div className="p-1.5 space-y-1">
        <div className="flex items-start gap-1.5 px-1.5 py-1 rounded bg-muted/30">
          <BookmarkSimple
            className="size-3 text-foreground shrink-0"
            weight="fill"
          />
          <div className="min-w-0 flex-1">
            <span className="text-[9px] text-foreground block">API docs link</span>
            <p className="text-[8px] text-muted-foreground truncate mt-0.5">
              docs.tryportal.app/api
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded">
          <BookmarkSimple className="size-3 text-muted-foreground shrink-0" />
          <span className="text-[9px] text-muted-foreground">
            Design spec from Sarah
          </span>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: Lightning,
    title: "Instant Sync",
    description:
      "Messages sync in real-time. No refresh needed — everything stays in sync, always.",
    MockComponent: MockInstantMessaging,
  },
  {
    icon: ShieldCheck,
    title: "Privacy First",
    description:
      "Your conversations stay yours. Self-host or use our platform with security built-in.",
    MockComponent: MockPrivacy,
  },
  {
    icon: Hash,
    title: "Team Channels",
    description:
      "Organize conversations into topic-based channels. Keep discussions focused.",
    MockComponent: MockChannels,
  },
  {
    icon: ChatCircle,
    title: "Direct Messages",
    description:
      "Private one-on-one conversations with read receipts and typing indicators.",
    MockComponent: MockDirectMessages,
  },
  {
    icon: Bell,
    title: "Smart Inbox",
    description:
      "All your mentions and unread messages in one place. Never miss what matters.",
    MockComponent: MockInbox,
  },
  {
    icon: BookmarkSimple,
    title: "Saved Items",
    description:
      "Save important messages for later. Quick access to what you need most.",
    MockComponent: MockSaved,
  },
];

export function Features() {
  return (
    <section className="py-10 sm:py-16 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Everything you need
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Built for teams who value simplicity, speed, and privacy.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="bg-background border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-foreground">
                  <feature.icon className="size-4" weight="fill" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {feature.title}
                </h3>
              </div>

              <feature.MockComponent />

              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
