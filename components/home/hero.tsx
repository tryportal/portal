"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowRight,
  Hash,
  ChartBar,
  Users,
  Bell,
  Tray,
  PaperPlaneTilt,
  Smiley,
  Plus,
  CaretDown,
  BookmarkSimple,
  ChatCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GitHubLogo } from "./icons/github-logo";
import { useTheme } from "@/lib/theme-provider";

// Easter egg mock data - keep saltjsx, gandan, fence post
const mockMessages = [
  {
    id: 1,
    user: {
      name: "saltjsx",
      initials: "SC",
      color: "bg-blue-500",
      avatarUrl:
        "https://n3we3vefdx.ufs.sh/f/eGnJHYz8xv2diyucfZpxbidAT07cmInyRusGPhqgv3Y6ofte",
    },
    content: "just pushed the new dashboard, looks clean!",
    time: "10:24 AM",
  },
  {
    id: 2,
    user: {
      name: "gandan",
      initials: "AR",
      color: "bg-emerald-500",
      avatarUrl:
        "https://n3we3vefdx.ufs.sh/f/eGnJHYz8xv2dpxxRouvZI06KUwkdMvxhQY7AmD5Fcog1O4RC",
    },
    content: "nice, reviewing now. real-time sync is smooth",
    time: "10:26 AM",
  },
  {
    id: 3,
    user: {
      name: "fence post",
      initials: "JL",
      color: "bg-violet-500",
      avatarUrl:
        "https://n3we3vefdx.ufs.sh/f/eGnJHYz8xv2d00LsWxKGlpX3vHIqaTnxzuFcBfiehJyDUw76",
    },
    content: "shipped to prod. we're live!",
    time: "10:28 AM",
  },
];

const mockChannels = [
  { name: "general", icon: Hash, unread: false },
  { name: "engineering", icon: Hash, unread: true },
  { name: "design", icon: Hash, unread: false },
];

// Message Item Component
function MessageItem({
  msg,
  idx,
}: {
  msg: (typeof mockMessages)[number];
  idx: number;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      key={msg.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + idx * 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-2.5"
    >
      <div
        className={`w-7 h-7 rounded-md ${msg.user.color} flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm`}
      >
        {msg.user.avatarUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.user.avatarUrl}
            alt={msg.user.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-[8px] font-medium text-white relative z-10">
            {msg.user.initials}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold text-foreground">
            {msg.user.name}
          </span>
          <span className="text-[10px] text-muted-foreground">{msg.time}</span>
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">
          {msg.content}
        </p>
      </div>
    </motion.div>
  );
}

// App Snapshot Component - the main demo UI
function AppSnapshot() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="w-full rounded-xl border border-border bg-card overflow-hidden shadow-lg shadow-foreground/5"
    >
      {/* Window Chrome */}
      <div className="h-10 bg-muted/60 border-b border-border flex items-center px-4 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <div className="w-3 h-3 rounded-full bg-green-400/80" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="text-xs text-muted-foreground font-medium">
            tryportal.app
          </div>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex h-[340px] sm:h-[380px]">
        {/* Sidebar */}
        <div className="w-48 sm:w-56 border-r border-border bg-background flex-shrink-0 flex flex-col">
          {/* Workspace Header */}
          <div className="h-11 border-b border-border px-3 flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-foreground flex items-center justify-center shadow-sm">
              <Image
                src={isDark ? "/portal.svg" : "/portal-dark.svg"}
                alt=""
                width={12}
                height={12}
              />
            </div>
            <span className="text-sm font-semibold text-foreground truncate">
              Acme Inc
            </span>
            <CaretDown className="size-3.5 text-muted-foreground ml-auto" />
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 p-2 space-y-0.5 overflow-hidden">
            {/* Navigation */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/50 cursor-default">
              <ChartBar className="size-4" />
              <span>Overview</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs bg-secondary text-foreground cursor-default">
              <Tray className="size-4" weight="fill" />
              <span className="font-medium">Inbox</span>
              <span className="ml-auto text-[10px] bg-foreground text-background rounded-full px-1.5 py-0.5 font-semibold">
                3
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/50 cursor-default">
              <ChatCircle className="size-4" />
              <span>Messages</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/50 cursor-default">
              <BookmarkSimple className="size-4" />
              <span>Saved</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/50 cursor-default">
              <Users className="size-4" />
              <span>People</span>
            </div>

            {/* Channels Section */}
            <div className="pt-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                <CaretDown className="size-3" />
                <span>Channels</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {mockChannels.map((channel) => (
                  <div
                    key={channel.name}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-default ${
                      channel.name === "engineering"
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Hash className="size-3.5" />
                    <span
                      className={
                        channel.unread ? "font-medium text-foreground" : ""
                      }
                    >
                      {channel.name}
                    </span>
                    {channel.unread && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel Header */}
          <div className="h-11 border-b border-border px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                engineering
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50">
                <Bell className="size-4" />
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden px-4 py-4 space-y-3">
            {mockMessages.map((msg, idx) => (
              <MessageItem key={msg.id} msg={msg} idx={idx} />
            ))}
          </div>

          {/* Message Input */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <button className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50">
                <Plus className="size-4" />
              </button>
              <div className="flex-1 text-xs text-muted-foreground">
                Message #engineering
              </div>
              <button className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50">
                <Smiley className="size-4" />
              </button>
              <button className="p-1.5 bg-foreground text-background rounded-md shadow-sm">
                <PaperPlaneTilt className="size-3.5" weight="fill" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Hero() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const userOrgs = useQuery(api.organizations.getUserOrganizations);

  const targetOrg =
    userOrgs?.find((org: { role: string }) => org.role === "admin") ||
    userOrgs?.[0];
  const workspaceUrl = targetOrg?.slug ? `/w/${targetOrg.slug}` : null;

  return (
    <section className="pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Hero Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
        >
          {/* Alpha Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground text-xs font-medium mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Now in Alpha
          </motion.div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-[1.1]">
            Your team&apos;s{" "}
            <span className="text-muted-foreground">home base</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            The first place you go when you start working. Chat with your team, 
            track what matters, and stay in sync — all in one place.
          </p>

          {/* CTA Button */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {authLoaded && (
              <>
                {isSignedIn && workspaceUrl ? (
                  <Link
                    href={workspaceUrl}
                    className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg font-semibold text-base hover:opacity-90 transition-all shadow-md shadow-foreground/10"
                  >
                    Go to Workspace
                    <ArrowRight size={18} weight="bold" />
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg font-semibold text-base hover:opacity-90 transition-all shadow-md shadow-foreground/10"
                  >
                    Get started free
                    <ArrowRight size={18} weight="bold" />
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <GitHubLogo className="w-4 h-4 text-foreground" />
              <span>Open Source</span>
            </div>
            <span className="text-border hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-foreground font-semibold">Free</span>
              <span>forever</span>
            </div>
            <span className="text-border hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <span>Self-host or cloud</span>
            </div>
          </div>
        </motion.div>

        {/* App Snapshot */}
        <div className="max-w-4xl mx-auto">
          <AppSnapshot />
        </div>
      </div>
    </section>
  );
}
