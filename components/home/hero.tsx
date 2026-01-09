"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Hash,
  ChartBar,
  Users,
  Bell,
  Tray,
  PaperPlaneTilt,
  Smiley,
  Plus,
  CaretDown,
  MagnifyingGlass,
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

// Mock data for the demo
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
    content: "Portal has actually real time messages using Convex!",
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
    content: "cool. it has a really nice ui too!",
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
    content: "what is a convex?",
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + idx * 0.15, duration: 0.4 }}
      className="flex gap-2"
    >
      <div
        className={`w-6 h-6 rounded ${msg.user.color} flex items-center justify-center shrink-0 overflow-hidden relative`}
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
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-semibold text-foreground">
            {msg.user.name}
          </span>
          <span className="text-[9px] text-muted-foreground">{msg.time}</span>
        </div>
        <p className="text-[11px] text-foreground/80 leading-relaxed">
          {msg.content}
        </p>
      </div>
    </motion.div>
  );
}

// Mock App UI Component
function MockAppUI() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="w-full rounded-lg border border-border bg-card overflow-hidden shadow-sm">
      {/* App Header */}
      <div className="h-8 bg-muted/50 border-b border-border flex items-center px-3 gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="text-[10px] text-muted-foreground font-medium">
            tryportal.app
          </div>
        </div>
      </div>

      <div className="flex h-[280px] sm:h-[320px]">
        {/* Sidebar */}
        <div className="w-40 sm:w-48 border-r border-border bg-background flex-shrink-0 flex flex-col">
          {/* Workspace Header */}
          <div className="h-9 border-b border-border px-2.5 flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-foreground flex items-center justify-center">
              <Image
                src={isDark ? "/portal.svg" : "/portal-dark.svg"}
                alt=""
                width={10}
                height={10}
              />
            </div>
            <span className="text-xs font-medium text-foreground truncate">
              Acme Inc
            </span>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 p-1.5 space-y-0.5 overflow-hidden">
            {/* Overview */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted/50 cursor-default">
              <ChartBar className="size-3.5" />
              <span>Overview</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-secondary text-foreground cursor-default">
              <Tray className="size-3.5" weight="fill" />
              <span>Inbox</span>
              <span className="ml-auto text-[9px] bg-foreground text-background rounded-full px-1 font-medium">
                3
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted/50 cursor-default">
              <ChatCircle className="size-3.5" />
              <span>Messages</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted/50 cursor-default">
              <BookmarkSimple className="size-3.5" />
              <span>Saved</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted/50 cursor-default">
              <Users className="size-3.5" />
              <span>People</span>
            </div>

            {/* Channels Section */}
            <div className="pt-2">
              <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                <CaretDown className="size-2.5" />
                <span>Channels</span>
              </div>
              <div className="mt-0.5 space-y-0.5">
                {mockChannels.map((channel) => (
                  <div
                    key={channel.name}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-default ${
                      channel.name === "engineering"
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Hash className="size-3" />
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
          <div className="h-9 border-b border-border px-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Hash className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">
                engineering
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="p-1 text-muted-foreground hover:text-foreground">
                <MagnifyingGlass className="size-3" />
              </div>
              <div className="p-1 text-muted-foreground hover:text-foreground">
                <Bell className="size-3" />
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden px-3 py-2 space-y-2">
            {mockMessages.map((msg, idx) => (
              <MessageItem key={msg.id} msg={msg} idx={idx} />
            ))}
          </div>

          {/* Message Input */}
          <div className="p-2 border-t border-border">
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5">
              <button className="p-0.5 text-muted-foreground hover:text-foreground">
                <Plus className="size-3" />
              </button>
              <div className="flex-1 text-[10px] text-muted-foreground">
                Message #engineering
              </div>
              <button className="p-0.5 text-muted-foreground hover:text-foreground">
                <Smiley className="size-3" />
              </button>
              <button className="p-0.5 bg-foreground/80 text-background rounded">
                <PaperPlaneTilt className="size-3" weight="fill" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
    <section className="pt-16 sm:pt-20 pb-8 sm:pb-12 px-4 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[10px] sm:text-xs mb-4"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            Now in Alpha
          </motion.div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
            Team chat that respects{" "}
            <span className="text-muted-foreground">your privacy.</span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Open-source alternative to Slack. Real-time messaging, organized
            channels, seamless collaboration — without the surveillance.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            {authLoaded && (
              <>
                {isSignedIn && workspaceUrl ? (
                  <Link
                    href={workspaceUrl}
                    className="inline-flex items-center gap-1.5 bg-foreground text-background px-5 py-2 rounded-md font-medium text-sm hover:opacity-90 transition-all"
                  >
                    Go to Workspace
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-1.5 bg-foreground text-background px-5 py-2 rounded-md font-medium text-sm hover:opacity-90 transition-all"
                  >
                    Get Started Free
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] sm:text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck
                size={14}
                weight="fill"
                className="text-foreground"
              />
              <span>Privacy-first</span>
            </div>
            <span className="text-muted-foreground/40">·</span>
            <div className="flex items-center gap-1.5">
              <GitHubLogo className="w-3.5 h-3.5 text-foreground" />
              <span>Open Source</span>
            </div>
            <span className="text-muted-foreground/40">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-foreground font-semibold">$0</span>
              <span>Free forever</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 sm:mt-10 max-w-3xl mx-auto"
        >
          <MockAppUI />
        </motion.div>
      </div>
    </section>
  );
}
